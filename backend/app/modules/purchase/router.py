import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.core.auth import require_auth, require_org, RequireRole, UserSession
from app.models.purchase import PurchaseOrder, PurchaseOrderItem
from app.models.inventory import Inventory, InventoryLedger, Product
from app.models.supplier import Supplier
from app.modules.purchase.schemas import (
    PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse, PurchaseOrderStatusUpdate
)

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])

# Security roles
require_viewer = Depends(RequireRole(["Viewer", "Employee"]))
require_manager = Depends(RequireRole(["Procurement Manager", "Organization Owner", "Super Admin"]))
require_admin = Depends(RequireRole(["Organization Owner", "Super Admin"]))

async def generate_po_number(db: AsyncSession) -> str:
    # Format: PO-YYYYMMDD-XXXX where XXXX is incremental sequence
    today_str = datetime.now(timezone.utc).replace(tzinfo=None).strftime("%Y%m%d")
    prefix = f"PO-{today_str}-"
    
    # Query count of POs created today
    stmt = select(func.count(PurchaseOrder.id)).where(PurchaseOrder.po_number.like(f"{prefix}%"))
    # Disable tenant filter temporarily to make PO numbers unique globally or within tenant context
    # Usually within tenant context is fine, but for globally unique format we search with skip_tenant_filter if wanted.
    # Here, doing within the tenant context is standard.
    res = await db.execute(stmt)
    count = res.scalar_one()
    
    sequence = str(count + 1).zfill(4)
    return f"{prefix}{sequence}"

@router.post("/", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED, dependencies=[require_manager])
async def create_purchase_order(
    po_in: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    # Verify supplier exists
    supplier_stmt = select(Supplier).where(Supplier.id == po_in.supplier_id)
    supplier_res = await db.execute(supplier_stmt)
    supplier = supplier_res.scalars().first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found.")

    po_number = await generate_po_number(db)
    
    # Calculate item totals
    total_amount = 0.0
    po_items = []
    
    for item in po_in.items:
        # Verify product exists
        prod_stmt = select(Product).where(Product.id == item.product_id)
        prod_res = await db.execute(prod_stmt)
        product = prod_res.scalars().first()
        if not product:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product with id {item.product_id} not found.")
            
        cost = float(item.unit_cost)
        total_cost = cost * item.quantity
        total_amount += total_cost
        
        po_items.append(
            PurchaseOrderItem(
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost=cost,
                total_cost=total_cost
            )
        )

    db_obj = PurchaseOrder(
        po_number=po_number,
        supplier_id=po_in.supplier_id,
        status="draft",
        total_amount=total_amount,
        tenant_id=current_user.tenant_id,
        created_by=current_user.user_id,
        items=po_items
    )
    
    db.add(db_obj)
    await db.commit()
    
    # Reload with details
    stmt = select(PurchaseOrder).where(PurchaseOrder.id == db_obj.id).options(
        selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product).selectinload(Product.category),
        selectinload(PurchaseOrder.supplier)
    )
    res = await db.execute(stmt)
    loaded_po = res.scalars().one()

    try:
        from app.modules.integrations.services import forward_webhook_to_n8n
        import asyncio
        asyncio.create_task(forward_webhook_to_n8n(
            tenant_id=loaded_po.tenant_id,
            event_name="purchase_order.created",
            data={
                "id": loaded_po.id,
                "po_number": loaded_po.po_number,
                "supplier_email": loaded_po.supplier.email,
                "status": loaded_po.status,
                "total_amount": float(loaded_po.total_amount)
            }
        ))
    except Exception:
        pass

    return loaded_po

@router.get("/", response_model=List[PurchaseOrderResponse], dependencies=[require_viewer])
async def list_purchase_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PurchaseOrder).options(
        selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product).selectinload(Product.category),
        selectinload(PurchaseOrder.supplier)
    )
    
    if status_filter:
        stmt = stmt.where(PurchaseOrder.status == status_filter)
        
    if search:
        stmt = stmt.join(Supplier).where(
            or_(
                PurchaseOrder.po_number.ilike(f"%{search}%"),
                Supplier.name.ilike(f"%{search}%"),
                Supplier.company_name.ilike(f"%{search}%")
            )
        )
        
    res = await db.execute(stmt.order_by(PurchaseOrder.created_at.desc()))
    return res.scalars().all()

@router.get("/{po_id}", response_model=PurchaseOrderResponse, dependencies=[require_viewer])
async def get_purchase_order(
    po_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PurchaseOrder).where(PurchaseOrder.id == po_id).options(
        selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product).selectinload(Product.category),
        selectinload(PurchaseOrder.supplier)
    )
    res = await db.execute(stmt)
    po = res.scalars().first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase Order not found.")
    return po

@router.post("/{po_id}/status", response_model=PurchaseOrderResponse)
async def update_po_status(
    po_id: str,
    status_update: PurchaseOrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Transition PO workflow state. Role checks are dynamically performed based on transition type.
    """
    stmt = select(PurchaseOrder).where(PurchaseOrder.id == po_id).options(
        selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product).selectinload(Product.category),
        selectinload(PurchaseOrder.supplier)
    )
    res = await db.execute(stmt)
    po = res.scalars().first()
    
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found.")
        
    old_status = po.status
    new_status = status_update.status
    
    if old_status == new_status:
        return po
        
    # State transition validation
    if new_status == "submitted":
        if old_status != "draft":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only submit draft POs.")
            
    elif new_status in ["approved", "rejected"]:
        # Only owners/admins can approve/reject
        if current_user.role not in ["org:admin", "org:owner"] and not (new_status == "approved" and current_user.role == "org:admin"):
            # Check if user has admin permission
            is_admin = RequireRole(["Organization Owner", "Super Admin"])
            is_admin(current_user)
            
        if old_status != "submitted":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only approve/reject submitted POs.")
            
        if new_status == "approved":
            po.approved_by = current_user.user_id
            po.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)
            
    elif new_status == "cancelled":
        if old_status in ["completed", "cancelled"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot cancel PO in status: {old_status}")
            
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid target status transition: {new_status}")
        
    po.status = new_status
    await db.commit()
    await db.refresh(po)

    try:
        from app.modules.integrations.services import forward_webhook_to_n8n
        import asyncio
        asyncio.create_task(forward_webhook_to_n8n(
            tenant_id=po.tenant_id,
            event_name="purchase_order.updated",
            data={
                "id": po.id,
                "po_number": po.po_number,
                "supplier_email": po.supplier.email,
                "status": po.status,
                "total_amount": float(po.total_amount)
            }
        ))
    except Exception:
        pass

    return po

@router.post("/{po_id}/receive", response_model=PurchaseOrderResponse)
async def receive_purchase_order(
    po_id: str,
    warehouse_id: str = Query(..., description="Warehouse ID where inventory will be received"),
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Receive items from an approved Purchase Order. 
    Decrements nothing but increments stock levels and logs audit ledger entries.
    Sets status to 'completed'.
    """
    # Verify manager role
    is_manager = RequireRole(["Warehouse Manager", "Procurement Manager", "Organization Owner", "Super Admin"])
    is_manager(current_user)

    stmt = select(PurchaseOrder).where(PurchaseOrder.id == po_id).options(
        selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product).selectinload(Product.category),
        selectinload(PurchaseOrder.supplier)
    )
    res = await db.execute(stmt)
    po = res.scalars().first()
    
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found.")
        
    if po.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Only approved Purchase Orders can be received. Current status: {po.status}"
        )

    # 1. Update inventory levels and create ledger entries for each item
    for item in po.items:
        # Find or create Inventory record
        inv_stmt = select(Inventory).where(
            Inventory.product_id == item.product_id,
            Inventory.warehouse_id == warehouse_id
        )
        inv_res = await db.execute(inv_stmt)
        inv = inv_res.scalars().first()

        if not inv:
            inv = Inventory(
                product_id=item.product_id,
                warehouse_id=warehouse_id,
                current_stock=0,
                reserved_stock=0,
                available_stock=0,
                tenant_id=current_user.tenant_id,
                created_by=current_user.user_id
            )
            db.add(inv)
            
        inv.current_stock += item.quantity
        inv.available_stock += item.quantity
        
        # Write to inventory ledger
        ledger = InventoryLedger(
            product_id=item.product_id,
            warehouse_id=warehouse_id,
            transaction_type="IN",
            quantity=item.quantity,
            reference_type="PURCHASE_ORDER",
            reference_id=po.id,
            tenant_id=current_user.tenant_id,
            created_by=current_user.user_id
        )
        db.add(ledger)

    po.status = "completed"
    await db.commit()
    await db.refresh(po)

    try:
        from app.modules.integrations.services import forward_webhook_to_n8n
        import asyncio
        asyncio.create_task(forward_webhook_to_n8n(
            tenant_id=po.tenant_id,
            event_name="purchase_order.updated",
            data={
                "id": po.id,
                "po_number": po.po_number,
                "supplier_email": po.supplier.email,
                "status": po.status,
                "total_amount": float(po.total_amount)
            }
        ))
    except Exception:
        pass

    return po
