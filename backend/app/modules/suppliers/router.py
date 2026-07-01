import csv
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.core.auth import require_auth, require_org, RequireRole, UserSession
from app.models.supplier import Supplier
from app.modules.suppliers.schemas import SupplierCreate, SupplierUpdate, SupplierResponse, SupplierListResponse

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

# Dependencies for role-based access control
require_viewer = Depends(RequireRole(["Viewer", "Employee"]))
require_manager = Depends(RequireRole(["Procurement Manager", "Organization Owner", "Super Admin"]))
require_admin = Depends(RequireRole(["Organization Owner", "Super Admin"]))

@router.post(
    "/",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[require_manager]
)
async def create_supplier(
    supplier_in: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Create a new supplier. Only Procurement Managers, Owners, and Admins can create suppliers.
    """
    # Check if supplier with same email exists in the tenant
    existing_stmt = select(Supplier).where(
        Supplier.email == supplier_in.email
    )
    res = await db.execute(existing_stmt)
    if res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A supplier with this email already exists."
        )

    # Insert with explicit tenant_id
    db_obj = Supplier(
        **supplier_in.model_dump(),
        tenant_id=current_user.tenant_id,
        created_by=current_user.user_id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    try:
        from app.modules.integrations.services import forward_webhook_to_n8n
        import asyncio
        asyncio.create_task(forward_webhook_to_n8n(
            tenant_id=db_obj.tenant_id,
            event_name="supplier.created",
            data={
                "id": db_obj.id,
                "name": db_obj.name,
                "email": db_obj.email,
                "status": db_obj.status
            }
        ))
    except Exception:
        pass

    return db_obj

@router.get("/", response_model=SupplierListResponse, dependencies=[require_viewer])
async def list_suppliers(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    min_rating: Optional[float] = Query(None, ge=0.0, le=5.0),
    db: AsyncSession = Depends(get_db)
):
    """
    List suppliers with pagination, search, status, and rating filters.
    """
    stmt = select(Supplier)

    # Apply search and filters
    if search:
        stmt = stmt.where(
            or_(
                Supplier.name.ilike(f"%{search}%"),
                Supplier.company_name.ilike(f"%{search}%"),
                Supplier.email.ilike(f"%{search}%"),
                Supplier.contact_person.ilike(f"%{search}%")
            )
        )
    
    if status_filter:
        stmt = stmt.where(Supplier.status == status_filter)
        
    if min_rating:
        stmt = stmt.where(Supplier.rating >= min_rating)

    # Get count before offset/limit
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one()

    # Apply offset/limit
    stmt = stmt.order_by(Supplier.name).offset((page - 1) * size).limit(size)
    res = await db.execute(stmt)
    items = res.scalars().all()

    pages = (total + size - 1) // size
    return SupplierListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/export", dependencies=[require_manager])
async def export_suppliers_csv(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Export suppliers as a CSV file.
    """
    stmt = select(Supplier)
    if search:
        stmt = stmt.where(
            or_(
                Supplier.name.ilike(f"%{search}%"),
                Supplier.company_name.ilike(f"%{search}%"),
                Supplier.email.ilike(f"%{search}%")
            )
        )
    if status_filter:
        stmt = stmt.where(Supplier.status == status_filter)

    res = await db.execute(stmt)
    suppliers = res.scalars().all()

    # Generate CSV in memory
    def iter_csv():
        output = StringIO()
        writer = csv.writer(output)
        # Header
        writer.writerow([
            "ID", "Name", "Company Name", "Email", "Phone", 
            "GSTIN", "PAN", "Contact Person", "Rating", "Status", "Notes"
        ])
        yield output.getvalue()
        output.truncate(0)
        output.seek(0)

        for supplier in suppliers:
            writer.writerow([
                supplier.id, supplier.name, supplier.company_name, 
                supplier.email, supplier.phone or "", supplier.gst_number or "", 
                supplier.pan_number or "", supplier.contact_person or "", 
                float(supplier.rating), supplier.status, supplier.notes or ""
            ])
            yield output.getvalue()
            output.truncate(0)
            output.seek(0)

    headers = {
        'Content-Disposition': 'attachment; filename="suppliers_export.csv"',
        'Content-Type': 'text/csv'
    }
    return StreamingResponse(iter_csv(), headers=headers)

@router.get("/{supplier_id}", response_model=SupplierResponse, dependencies=[require_viewer])
async def get_supplier(
    supplier_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve details of a single supplier.
    """
    stmt = select(Supplier).where(Supplier.id == supplier_id)
    res = await db.execute(stmt)
    supplier = res.scalars().first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found."
        )
    return supplier

@router.patch("/{supplier_id}", response_model=SupplierResponse, dependencies=[require_manager])
async def update_supplier(
    supplier_id: str,
    supplier_in: SupplierUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update a supplier's fields. Only Procurement Managers, Owners, and Admins can update.
    """
    stmt = select(Supplier).where(Supplier.id == supplier_id)
    res = await db.execute(stmt)
    db_obj = res.scalars().first()
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found."
        )

    # Perform update
    update_data = supplier_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)

    await db.commit()
    await db.refresh(db_obj)

    try:
        from app.modules.integrations.services import forward_webhook_to_n8n
        import asyncio
        asyncio.create_task(forward_webhook_to_n8n(
            tenant_id=db_obj.tenant_id,
            event_name="supplier.updated",
            data={
                "id": db_obj.id,
                "name": db_obj.name,
                "email": db_obj.email,
                "status": db_obj.status
            }
        ))
    except Exception:
        pass

    return db_obj

@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[require_admin])
async def delete_supplier(
    supplier_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Hard delete a supplier. Only Admins/Owners can perform this action.
    """
    stmt = select(Supplier).where(Supplier.id == supplier_id)
    res = await db.execute(stmt)
    db_obj = res.scalars().first()
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found."
        )
    
    await db.delete(db_obj)
    await db.commit()
    return None
