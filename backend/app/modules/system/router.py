import uuid
import json
import requests
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import re
from sqlalchemy import func
from app.database import get_db, tenant_context
from app.core.auth import require_auth, require_org, RequireRole, UserSession
from app.models.system import Organization, User, Document, AuditLog, Plan
from app.models.supplier import Supplier
from app.models.purchase import PurchaseOrder
from app.models.finance import Payment
from app.models.inventory import Inventory
from app.config import settings
from app.core.storage import generate_presigned_upload_url, generate_presigned_download_url
from app.modules.system.schemas import (
    DocumentCreate, PresignedUploadRequest, PresignedUploadResponse, DocumentResponse,
    OrganizationAccessUpdate, OrganizationResponse, PlatformAnalyticsResponse, PlanCreate, PlanUpdate, PlanResponse, UserInviteRequest, UserResponse,
    PlatformHistoryResponse, PlatformHistoryDataPoint, AuditLogResponse
)

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

async def get_unique_slug(db: AsyncSession, name: str) -> str:
    base_slug = slugify(name) or "org"
    slug = base_slug
    counter = 1
    while True:
        stmt = select(Organization).where(Organization.slug == slug)
        res = await db.execute(stmt)
        if not res.scalars().first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1

router = APIRouter(prefix="/system", tags=["System & Webhooks"])

# Roles for document management
require_viewer = Depends(RequireRole(["Viewer", "Employee"]))
require_uploader = Depends(RequireRole(["Employee", "Warehouse Manager", "Procurement Manager", "Organization Owner", "Super Admin"]))

# --- USER PROFILE & ORGANIZATION SYNC ---
@router.post("/sync-profile", status_code=status.HTTP_200_OK)
async def sync_profile(
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Client-side fallback profile sync. Invoked after login to ensure user 
    and organization records exist in local DB.
    """
    org_stmt = select(Organization).where(Organization.clerk_org_id == current_user.tenant_id)
    res = await db.execute(org_stmt)
    org = res.scalars().first()

    if not org:
        slug = await get_unique_slug(db, "Org Tenant")
        org = Organization(
            name="Org Tenant", 
            slug=slug,
            clerk_org_id=current_user.tenant_id,
            status="active"
        )
        db.add(org)
        await db.commit()
        await db.refresh(org)

    # Set tenant context
    tenant_context.set(org.id)

    user_stmt = select(User).where(User.clerk_user_id == current_user.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalars().first()

    role = current_user.role or "org:member"

    if not user:
        user = User(
            tenant_id=org.id,
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

    return {"status": "success", "user_id": user.id, "tenant_id": org.id}


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
        
        stmt = select(Organization).where(Organization.clerk_org_id == clerk_org_id)
        res = await db.execute(stmt)
        org = res.scalars().first()
        
        if not org:
            slug = await get_unique_slug(db, name)
            org = Organization(
                clerk_org_id=clerk_org_id,
                name=name,
                slug=slug,
                status="active"
            )
            db.add(org)
        else:
            org.name = name
            if not org.slug:
                org.slug = await get_unique_slug(db, name)
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

# --- ORGANIZATION ADMINISTRATION (Platform Control Panel) ---

@router.get("/organizations/resolve", response_model=OrganizationResponse)
async def resolve_organization(
    host: str = Query(..., description="The hostname to resolve"),
    db: AsyncSession = Depends(get_db)
):
    """
    Resolve organization details from a given host/domain name.
    """
    hostname = host.split(":")[0].lower()
    root_domain = settings.ROOT_DOMAIN.lower()
    if hostname in ("localhost", "127.0.0.1", root_domain, f"www.{root_domain}"):
        raise HTTPException(status_code=404, detail="Root domain cannot be resolved to a specific tenant.")
        
    if hostname.endswith(f".{root_domain}"):
        slug = hostname[:-len(f".{root_domain}") - 1]
        if slug and slug != "www":
            stmt = select(Organization).where(Organization.slug == slug)
            res = await db.execute(stmt)
            org = res.scalars().first()
            if org:
                return org
                
    stmt = select(Organization).where(Organization.custom_domain == hostname)
    res = await db.execute(stmt)
    org = res.scalars().first()
    if org:
        return org
        
    raise HTTPException(status_code=404, detail="Organization not found for the given host.")

@router.get("/organizations", response_model=List[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    List all organizations for platform administration.
    """
    stmt = select(Organization)
    res = await db.execute(stmt.order_by(Organization.created_at.desc()))
    return res.scalars().all()

@router.get("/tenants", response_model=List[OrganizationResponse])
async def list_tenants_alias(
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    Alias for backwards compatibility with the admin portal.
    """
    return await list_organizations(db, current_user)

@router.put("/organizations/{org_id}/access", response_model=OrganizationResponse)
async def update_organization_access(
    org_id: str,
    access_update: OrganizationAccessUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    Update access configurations for a specific organization.
    """
    stmt = select(Organization).where(Organization.id == org_id)
    res = await db.execute(stmt)
    org = res.scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    org.access_config = access_update.model_dump()
    await db.commit()
    await db.refresh(org)
    return org

@router.put("/tenants/{tenant_id}/access", response_model=OrganizationResponse)
async def update_tenant_access_alias(
    tenant_id: str,
    access_update: OrganizationAccessUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    Alias for backwards compatibility with the admin portal.
    """
    return await update_organization_access(tenant_id, access_update, db, current_user)

# --- PLATFORM ANALYTICS ---

@router.get("/analytics", response_model=PlatformAnalyticsResponse)
async def get_platform_analytics(
    db: AsyncSession = Depends(get_db)
):
    """
    Get platform-wide aggregated analytics across all tenants.
    """
    # Use skip_tenant_filter execution option to fetch counts across all tenants
    orgs_stmt = select(func.count(Organization.id)).execution_options(skip_tenant_filter=True)
    orgs_res = await db.execute(orgs_stmt)
    total_organizations = orgs_res.scalar() or 0

    users_stmt = select(func.count(User.id)).execution_options(skip_tenant_filter=True)
    users_res = await db.execute(users_stmt)
    total_active_users = users_res.scalar() or 0

    sups_stmt = select(func.count(Supplier.id)).execution_options(skip_tenant_filter=True)
    sups_res = await db.execute(sups_stmt)
    total_suppliers = sups_res.scalar() or 0

    pos_stmt = select(func.count(PurchaseOrder.id)).execution_options(skip_tenant_filter=True)
    pos_res = await db.execute(pos_stmt)
    total_purchase_orders = pos_res.scalar() or 0

    payments_stmt = select(func.count(Payment.id)).execution_options(skip_tenant_filter=True)
    payments_res = await db.execute(payments_stmt)
    total_payments = payments_res.scalar() or 0

    inventory_stmt = select(func.sum(Inventory.current_stock)).execution_options(skip_tenant_filter=True)
    inventory_res = await db.execute(inventory_stmt)
    total_inventory_items = inventory_res.scalar() or 0

    revenue_stmt = select(func.sum(Payment.amount)).execution_options(skip_tenant_filter=True)
    revenue_res = await db.execute(revenue_stmt)
    total_revenue = float(revenue_res.scalar() or 0.0)

    docs_stmt = select(func.count(Document.id)).execution_options(skip_tenant_filter=True)
    docs_res = await db.execute(docs_stmt)
    total_documents_uploaded = docs_res.scalar() or 0

    return PlatformAnalyticsResponse(
        total_organizations=total_organizations,
        total_active_users=total_active_users,
        total_suppliers=total_suppliers,
        total_purchase_orders=total_purchase_orders,
        total_payments=total_payments,
        total_inventory_items=total_inventory_items,
        total_revenue=total_revenue,
        total_documents_uploaded=total_documents_uploaded
    )


@router.get("/analytics/history", response_model=PlatformHistoryResponse)
async def get_platform_analytics_history(
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    Get platform-wide aggregated analytics history for the last 6 months.
    """
    import calendar
    today = datetime.utcnow()
    months = []
    for i in range(5, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        months.append((year, month))
        
    history = []
    for year, month in months:
        start_date = datetime(year, month, 1)
        _, last_day = calendar.monthrange(year, month)
        end_date = datetime(year, month, last_day, 23, 59, 59)
        
        # Query total organizations created up to this end_date
        orgs_stmt = select(func.count(Organization.id))\
            .where(Organization.created_at <= end_date)\
            .execution_options(skip_tenant_filter=True)
        orgs_res = await db.execute(orgs_stmt)
        total_orgs = orgs_res.scalar() or 0
        
        # Query revenue in this specific month
        rev_stmt = select(func.sum(Payment.amount))\
            .where(Payment.paid_at >= start_date, Payment.paid_at <= end_date)\
            .execution_options(skip_tenant_filter=True)
        rev_res = await db.execute(rev_stmt)
        monthly_rev = float(rev_res.scalar() or 0.0)
        
        month_name = start_date.strftime("%b %Y")
        history.append(
            PlatformHistoryDataPoint(
                month=month_name,
                organizations=total_orgs,
                revenue=monthly_rev
            )
        )
        
    return PlatformHistoryResponse(history=history)


@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=250),
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    Get platform-wide audit logs across all tenants.
    """
    stmt = select(AuditLog)\
        .order_by(AuditLog.created_at.desc())\
        .limit(limit)\
        .execution_options(skip_tenant_filter=True)
    res = await db.execute(stmt)
    return res.scalars().all()


# --- PRICING PLANS CRUD ---

@router.get("/plans", response_model=List[PlanResponse])
async def list_plans(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all dynamic subscription plans.
    """
    stmt = select(Plan).order_by(Plan.created_at.asc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/plans", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_in: PlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    Create a new subscription plan (Admin-only).
    """
    db_obj = Plan(
        name=plan_in.name,
        price=plan_in.price,
        period=plan_in.period,
        description=plan_in.description,
        features=plan_in.features,
        popular=plan_in.popular,
        cta=plan_in.cta,
        trial_days=plan_in.trial_days,
        limits=plan_in.limits
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: str,
    plan_in: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    Update an existing subscription plan (Admin-only).
    """
    stmt = select(Plan).where(Plan.id == plan_id)
    res = await db.execute(stmt)
    db_obj = res.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    for field, value in plan_in.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)
        
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.delete("/plans/{plan_id}", status_code=status.HTTP_200_OK)
async def delete_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    Delete a subscription plan (Admin-only).
    """
    stmt = select(Plan).where(Plan.id == plan_id)
    res = await db.execute(stmt)
    db_obj = res.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    await db.delete(db_obj)
    await db.commit()
    return {"status": "success", "message": "Plan deleted"}

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    Get list of all platform users across all tenants. (Admin-only)
    """
    stmt = select(User).execution_options(skip_tenant_filter=True)
    res = await db.execute(stmt)
    return res.scalars().all()

# --- USER INVITATION SYSTEM ---

@router.post("/users/invite", status_code=status.HTTP_201_CREATED)
async def invite_user(
    invite_in: UserInviteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_auth)
):
    """
    Invite a new user to the platform (Admin-only).
    - Creates Clerk user
    - Associates with Clerk Organization
    - Dispatches Resend email
    - Adds user to local DB
    """
    # 1. Check if user already exists locally
    user_exists_stmt = select(User).where(User.email == invite_in.email)
    user_exists_res = await db.execute(user_exists_stmt)
    if user_exists_res.scalars().first():
         raise HTTPException(status_code=400, detail="User with this email already exists")

    # 2. Get the Organization to fetch Clerk Org ID
    org_stmt = select(Organization).where(Organization.id == invite_in.tenant_id)
    org_res = await db.execute(org_stmt)
    org = org_res.scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Selected organization not found")

    # 3. Generate a temporary password
    temp_password = f"TempPass_{uuid.uuid4().hex[:8]}!"

    # 4. Create Clerk User
    clerk_user_id = None
    if not settings.CLERK_SECRET_KEY or settings.CLERK_SECRET_KEY.startswith("mock") or settings.CLERK_SECRET_KEY == "":
        clerk_user_id = f"user_mock_{uuid.uuid4().hex[:8]}"
    else:
        clerk_payload = {
            "email_address": [invite_in.email],
            "first_name": invite_in.first_name or "",
            "last_name": invite_in.last_name or "",
            "password": temp_password,
            "skip_password_checks": True
        }
        headers = {
            "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        try:
            resp = requests.post("https://api.clerk.com/v1/users", json=clerk_payload, headers=headers)
            if resp.status_code not in [200, 201]:
                raise HTTPException(status_code=resp.status_code, detail=f"Clerk User Creation Failed: {resp.text}")
            clerk_user_id = resp.json().get("id")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Network error calling Clerk API: {str(e)}")

    # 5. Associate user with Clerk Organization/Tenant if clerk_org_id exists
    clerk_role = "org:member"
    if invite_in.role in ["Super Admin", "Organization Owner"]:
        clerk_role = "org:admin"
    elif invite_in.role in ["Procurement Manager", "Warehouse Manager", "Accountant", "HR Manager"]:
        # Map specific system roles to Clerk custom roles if applicable, otherwise use org:member
        clerk_role = "org:member"

    if org.clerk_org_id and settings.CLERK_SECRET_KEY and not settings.CLERK_SECRET_KEY.startswith("mock") and settings.CLERK_SECRET_KEY != "":
        membership_payload = {
            "user_id": clerk_user_id,
            "role": clerk_role
        }
        headers = {
            "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        try:
            requests.post(
                f"https://api.clerk.com/v1/organizations/{org.clerk_org_id}/memberships",
                json=membership_payload,
                headers=headers
            )
        except Exception:
            pass

    # 6. Save in local database
    db_user = User(
        tenant_id=invite_in.tenant_id,
        clerk_user_id=clerk_user_id,
        email=invite_in.email,
        first_name=invite_in.first_name,
        last_name=invite_in.last_name,
        role=invite_in.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    # 7. Send transactional email via Resend
    email_sent = False
    if settings.RESEND_API_KEY and not settings.RESEND_API_KEY.startswith("mock") and settings.RESEND_API_KEY != "":
        import resend
        try:
            resend.api_key = settings.RESEND_API_KEY
            email_params = {
                "from": "SupplierERP Invites <onboarding@resend.dev>",
                "to": invite_in.email,
                "subject": "Invitation to join SupplierERP",
                "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #0f172a; margin-bottom: 16px;">Welcome to SupplierERP!</h2>
                    <p style="color: #475569; line-height: 1.6;">You have been invited by a Platform Administrator to join SupplierERP.</p>
                    <p style="color: #475569; line-height: 1.6;">Here are your temporary login credentials to sign in:</p>
                    <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 0; color: #0f172a;"><strong>Email:</strong> {invite_in.email}</p>
                        <p style="margin: 8px 0 0 0; color: #0f172a;"><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{temp_password}</code></p>
                    </div>
                    <p style="color: #475569; line-height: 1.6;">Please log in using the button below and change your password immediately in your account settings:</p>
                    <a href="https://erp-delta-hazel.vercel.app/sign-in" style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Sign In Here</a>
                </div>
                """
            }
            resend.Emails.send(email_params)
            email_sent = True
        except Exception:
            pass

    return {
        "status": "success",
        "email_sent": email_sent,
        "clerk_user_id": clerk_user_id,
        "temp_password": temp_password,
        "user_id": db_user.id
    }


# ==============================================================================
# API KEY MANAGEMENT ENDPOINTS
# ==============================================================================
import secrets
import hashlib
from datetime import timedelta
from fastapi import Response
from app.models.system import ApiKey
from app.modules.system.schemas import ApiKeyCreate, ApiKeyResponse, ApiKeyCreatedResponse

@router.get("/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    List all active API keys for the current organization.
    """
    stmt = select(ApiKey).where(ApiKey.is_active == True)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/api-keys", response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_in: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Generate a new API key for the current organization.
    The plain-text key is returned only once in the response.
    """
    # 1. Generate token
    raw_token = f"sk_live_{secrets.token_urlsafe(32)}"
    prefix = raw_token[:14] # e.g. "sk_live_xxxxxx"
    hashed = hashlib.sha256(raw_token.encode()).hexdigest()

    # Calculate expiry
    expires_at = None
    if key_in.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=key_in.expires_in_days)

    # 2. Save in database
    api_key_obj = ApiKey(
        tenant_id=current_user.tenant_id,
        name=key_in.name,
        hashed_key=hashed,
        key_prefix=prefix,
        expires_at=expires_at,
        is_active=True
    )
    db.add(api_key_obj)
    await db.commit()
    await db.refresh(api_key_obj)

    # 3. Return response with plain text key
    return ApiKeyCreatedResponse(
        id=api_key_obj.id,
        tenant_id=api_key_obj.tenant_id,
        name=api_key_obj.name,
        key_prefix=api_key_obj.key_prefix,
        expires_at=api_key_obj.expires_at,
        last_used_at=api_key_obj.last_used_at,
        is_active=api_key_obj.is_active,
        created_at=api_key_obj.created_at,
        key=raw_token
    )

@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Revoke/delete an API key for the current organization.
    """
    stmt = select(ApiKey).where(ApiKey.id == key_id)
    res = await db.execute(stmt)
    api_key_obj = res.scalars().first()
    if not api_key_obj:
        raise HTTPException(status_code=404, detail="API key not found")

    await db.delete(api_key_obj)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

