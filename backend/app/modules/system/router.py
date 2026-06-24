import uuid
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, tenant_context
from app.core.auth import require_auth, require_org, RequireRole, UserSession
from app.models.system import Tenant, User, Document, AuditLog
from app.config import settings
from app.core.storage import generate_presigned_upload_url, generate_presigned_download_url
from app.modules.system.schemas import (
    DocumentCreate, PresignedUploadRequest, PresignedUploadResponse, DocumentResponse,
    TenantAccessUpdate, TenantResponse
)

router = APIRouter(prefix="/system", tags=["System & Webhooks"])

# Roles for document management
require_viewer = Depends(RequireRole(["Viewer", "Employee"]))
require_uploader = Depends(RequireRole(["Employee", "Warehouse Manager", "Procurement Manager", "Organization Owner", "Super Admin"]))

# --- USER PROFILE & TENANT SYNC ---
@router.post("/sync-profile", status_code=status.HTTP_200_OK)
async def sync_profile(
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Client-side fallback profile sync. Invoked after login to ensure user 
    and tenant records exist in local DB.
    """
    tenant_stmt = select(Tenant).where(Tenant.clerk_org_id == current_user.tenant_id)
    res = await db.execute(tenant_stmt)
    tenant = res.scalars().first()

    if not tenant:
        tenant = Tenant(
            name="Org Tenant", 
            clerk_org_id=current_user.tenant_id,
            status="active"
        )
        db.add(tenant)
        await db.commit()
        await db.refresh(tenant)

    # Set tenant context
    tenant_context.set(tenant.id)

    user_stmt = select(User).where(User.clerk_user_id == current_user.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalars().first()

    role = current_user.role or "org:member"

    if not user:
        user = User(
            tenant_id=tenant.id,
            clerk_user_id=current_user.user_id,
            email=current_user.email,
            role=role
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        user.email = current_user.email
        user.role = role
        await db.commit()

    return {"status": "success", "user_id": user.id, "tenant_id": tenant.id}


# --- CLERK WEBHOOK ---
@router.post("/webhooks/clerk", status_code=status.HTTP_200_OK)
async def clerk_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    svix_id: Optional[str] = Header(None, alias="svix-id"),
    svix_signature: Optional[str] = Header(None, alias="svix-signature"),
    svix_timestamp: Optional[str] = Header(None, alias="svix-timestamp")
):
    """
    Webhook handler for Clerk organization & user lifecycle events.
    """
    body = await request.body()
    payload = json.loads(body)
    
    event_type = payload.get("type")
    data = payload.get("data", {})
    
    if event_type == "organization.created" or event_type == "organization.updated":
        clerk_org_id = data.get("id")
        name = data.get("name")
        
        stmt = select(Tenant).where(Tenant.clerk_org_id == clerk_org_id)
        res = await db.execute(stmt)
        tenant = res.scalars().first()
        
        if not tenant:
            tenant = Tenant(
                clerk_org_id=clerk_org_id,
                name=name,
                status="active"
            )
            db.add(tenant)
        else:
            tenant.name = name
        await db.commit()

    elif event_type == "user.created" or event_type == "user.updated":
        clerk_user_id = data.get("id")
        email_addresses = data.get("email_addresses", [])
        email = email_addresses[0].get("email_address") if email_addresses else ""
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        
        stmt = select(User).where(User.clerk_user_id == clerk_user_id)
        res = await db.execute(stmt)
        user = res.scalars().first()
        
        if user:
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            await db.commit()

    return {"status": "processed"}


# --- DOCUMENT MANAGEMENT (Cloudflare R2 Integration) ---
@router.post(
    "/documents/presigned-upload", 
    response_model=PresignedUploadResponse, 
    dependencies=[require_uploader]
)
async def get_presigned_upload(
    req: PresignedUploadRequest,
    current_user: UserSession = Depends(require_org)
):
    """
    Generate a presigned upload URL. Directs files to a tenant-scoped path on Cloudflare R2.
    """
    # Create unique object key inside tenant's path
    unique_id = str(uuid.uuid4())
    safe_name = req.name.replace(" ", "_")
    file_key = f"tenants/{current_user.tenant_id}/docs/{unique_id}_{safe_name}"
    
    try:
        upload_url = generate_presigned_upload_url(
            file_key=file_key,
            content_type=req.content_type
        )
        return PresignedUploadResponse(
            file_key=file_key,
            upload_url=upload_url
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned upload URL: {str(e)}"
        )

@router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED, dependencies=[require_uploader])
async def register_document(
    doc_in: DocumentCreate,
    file_key: str = Query(..., description="The key returned from presigned-upload"),
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Register a successfully uploaded file in the database.
    """
    db_obj = Document(
        name=doc_in.name,
        file_key=file_key,
        file_type=doc_in.file_type,
        file_size=doc_in.file_size,
        reference_type=doc_in.reference_type,
        reference_id=doc_in.reference_id,
        tenant_id=current_user.tenant_id,
        created_by=current_user.user_id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("/documents", response_model=List[DocumentResponse], dependencies=[require_viewer])
async def list_documents(
    ref_type: Optional[str] = Query(None, alias="reference_type"),
    ref_id: Optional[str] = Query(None, alias="reference_id"),
    db: AsyncSession = Depends(get_db)
):
    """
    List registered documents. Can be filtered by reference (e.g. all docs for a Purchase Order).
    """
    stmt = select(Document)
    if ref_type:
        stmt = stmt.where(Document.reference_type == ref_type)
    if ref_id:
        stmt = stmt.where(Document.reference_id == ref_id)
        
    res = await db.execute(stmt.order_by(Document.created_at.desc()))
    return res.scalars().all()

@router.get("/documents/{doc_id}/download", dependencies=[require_viewer])
async def get_presigned_download(
    doc_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve a temporary presigned download URL for a document.
    """
    stmt = select(Document).where(Document.id == doc_id)
    res = await db.execute(stmt)
    doc = res.scalars().first()
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
        
    try:
        download_url = generate_presigned_download_url(doc.file_key)
        return {"download_url": download_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate download URL: {str(e)}"
        )

# --- TENANT ADMINISTRATION (Platform Control Panel) ---

@router.get("/tenants", response_model=List[TenantResponse])
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    List all tenants for platform administration.
    """
    stmt = select(Tenant)
    res = await db.execute(stmt.order_by(Tenant.created_at.desc()))
    return res.scalars().all()

@router.put("/tenants/{tenant_id}/access", response_model=TenantResponse)
async def update_tenant_access(
    tenant_id: str,
    access_update: TenantAccessUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    Update access configurations for a specific tenant.
    """
    stmt = select(Tenant).where(Tenant.id == tenant_id)
    res = await db.execute(stmt)
    tenant = res.scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    tenant.access_config = access_update.dict()
    await db.commit()
    await db.refresh(tenant)
    return tenant
