import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.core.auth import require_auth, require_org, RequireRole, UserSession
from app.models.sales import SalesOrder, SalesOrderItem
from app.models.inventory import Inventory, InventoryLedger, Product
from app.models.integration import Customer
from app.modules.sales.schemas import (
    SalesOrderCreate, SalesOrderUpdateStatus, SalesOrderResponse, SalesOrderListResponse
)

router = APIRouter(prefix="/sales-orders", tags=["Sales Orders"])

# Security roles
require_viewer = Depends(RequireRole(["Viewer", "Employee"]))
require_manager = Depends(RequireRole(["Sales Manager", "Procurement Manager", "Organization Owner", "Super Admin"]))
require_admin = Depends(RequireRole(["Organization Owner", "Super Admin"]))

async def generate_so_number(db: AsyncSession) -> str:
    today_str = datetime.now(timezone.utc).replace(tzinfo=None).strftime("%Y%m%d")
    prefix = f"SO-{today_str}-"
    stmt = select(func.count(SalesOrder.id)).where(SalesOrder.so_number.like(f"{prefix}%"))
    res = await db.execute(stmt)
    count = res.scalar_one()
    sequence = str(count + 1).zfill(4)
    return f"{prefix}{sequence}"

@router.post("/", response_model=SalesOrderResponse, status_code=status.HTTP_201_CREATED, dependencies=[require_manager])
async def create_sales_order(
    so_in: SalesOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    # Verify customer exists
    customer_stmt = select(Customer).where(Customer.id == so_in.customer_id)
    customer_res = await db.execute(customer_stmt)
    customer = customer_res.scalars().first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    so_number = await generate_so_number(db)
    total_amount = 0.0
    so_items = []

    for item in so_in.items:
        prod_stmt = select(Product).where(Product.id == item.product_id)
        prod_res = await db.execute(prod_stmt)
        product = prod_res.scalars().first()
        if not product:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product with id {item.product_id} not found.")

        price = float(item.unit_price)
        total_item_price = price * item.quantity
        total_amount += total_item_price

        so_items.append(
            SalesOrderItem(
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=price,
                total_price=total_item_price
            )
        )

    db_obj = SalesOrder(
        so_number=so_number,
        customer_id=so_in.customer_id,
        status="draft",
        total_amount=total_amount,
        tenant_id=current_user.tenant_id,
        created_by=current_user.user_id,
        items=so_items
    )

    db.add(db_obj)
    await db.commit()

    stmt = select(SalesOrder).where(SalesOrder.id == db_obj.id).options(
        selectinload(SalesOrder.items).selectinload(SalesOrderItem.product),
        selectinload(SalesOrder.customer)
    )
    res = await db.execute(stmt)
    order = res.scalars().one()

    # Trigger outgoing webhook if registered (will implement helper)
    try:
        from app.modules.integrations.services import forward_webhook_to_n8n
        import asyncio
        asyncio.create_task(forward_webhook_to_n8n(
            tenant_id=current_user.tenant_id,
            event_name="sales_order.created",
            data={
                "id": order.id,
                "so_number": order.so_number,
                "customer_email": order.customer.email,
                "status": order.status,
                "total_amount": float(order.total_amount)
            }
        ))
    except Exception:
        pass

    return order

@router.get("/", response_model=SalesOrderListResponse, dependencies=[require_viewer])
async def list_sales_orders(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SalesOrder).options(
        selectinload(SalesOrder.items).selectinload(SalesOrderItem.product),
        selectinload(SalesOrder.customer)
    )

    if search:
        stmt = stmt.join(Customer).where(
            or_(
                SalesOrder.so_number.ilike(f"%{search}%"),
                Customer.name.ilike(f"%{search}%"),
                Customer.email.ilike(f"%{search}%")
            )
        )
    if status_filter:
        stmt = stmt.where(SalesOrder.status == status_filter)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one()

    stmt = stmt.order_by(SalesOrder.created_at.desc()).offset((page - 1) * size).limit(size)
    res = await db.execute(stmt)
    items = res.scalars().all()

    pages = (total + size - 1) // size
    return SalesOrderListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )
@router.get("/customers", response_model=List[dict], dependencies=[require_viewer])
async def list_customers(
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    stmt = select(Customer).where(Customer.tenant_id == current_user.tenant_id)
    res = await db.execute(stmt)
    customers = res.scalars().all()
    return [{"id": str(c.id), "name": c.name, "email": c.email} for c in customers]

@router.post("/customers", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[require_manager])
async def create_customer(
    customer_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    name = customer_data.get("name")
    email = customer_data.get("email")
    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and Email are required.")
    
    # Check if customer already exists for this tenant
    stmt = select(Customer).where(Customer.tenant_id == current_user.tenant_id, Customer.email == email)
    res = await db.execute(stmt)
    existing = res.scalars().first()
    if existing:
        return {"id": str(existing.id), "name": existing.name, "email": existing.email}

    new_cust = Customer(
        name=name,
        email=email,
        company_name=customer_data.get("company_name"),
        phone=customer_data.get("phone"),
        tenant_id=current_user.tenant_id
    )
    db.add(new_cust)
    await db.commit()
    await db.refresh(new_cust)
    return {"id": str(new_cust.id), "name": new_cust.name, "email": new_cust.email}


@router.get("/{so_id}", response_model=SalesOrderResponse, dependencies=[require_viewer])
async def get_sales_order(so_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(SalesOrder).where(SalesOrder.id == so_id).options(
        selectinload(SalesOrder.items).selectinload(SalesOrderItem.product),
        selectinload(SalesOrder.customer)
    )
    res = await db.execute(stmt)
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order not found.")
    return order

@router.patch("/{so_id}", response_model=SalesOrderResponse, dependencies=[require_manager])
async def update_sales_order_status(
    so_id: str,
    status_update: SalesOrderUpdateStatus,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    stmt = select(SalesOrder).where(SalesOrder.id == so_id).options(
        selectinload(SalesOrder.items).selectinload(SalesOrderItem.product),
        selectinload(SalesOrder.customer)
    )
    res = await db.execute(stmt)
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order not found.")

    old_status = order.status
    new_status = status_update.status

    if old_status == new_status:
        return order

    # State transitions validation
    if new_status == "approved":
        if old_status != "draft":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only approve draft Sales Orders.")
    elif new_status == "cancelled":
        if old_status in ["completed", "cancelled"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot cancel order in status: {old_status}")
    elif new_status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="To complete a Sales Order, perform /deliver endpoint call.")

    order.status = new_status
    await db.commit()
    
    # Re-query order with selectinload to prevent lazy loading errors in response serialization
    stmt_order = select(SalesOrder).where(SalesOrder.id == order.id).options(
        selectinload(SalesOrder.items).selectinload(SalesOrderItem.product),
        selectinload(SalesOrder.customer)
    )
    res_order = await db.execute(stmt_order)
    order = res_order.scalars().first()

    # Trigger N8N webhook
    try:
        from app.modules.integrations.services import forward_webhook_to_n8n
        import asyncio
        asyncio.create_task(forward_webhook_to_n8n(
            tenant_id=current_user.tenant_id,
            event_name="sales_order.updated",
            data={
                "id": order.id,
                "so_number": order.so_number,
                "customer_email": order.customer.email,
                "status": order.status,
                "total_amount": float(order.total_amount)
            }
        ))
    except Exception:
        pass

    return order

@router.post("/{so_id}/deliver", response_model=SalesOrderResponse)
async def deliver_sales_order(
    so_id: str,
    warehouse_id: str = Query(..., description="Warehouse ID where inventory will be deducted from"),
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    stmt = select(SalesOrder).where(SalesOrder.id == so_id).options(
        selectinload(SalesOrder.items).selectinload(SalesOrderItem.product),
        selectinload(SalesOrder.customer)
    )
    res = await db.execute(stmt)
    order = res.scalars().first()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order not found.")

    if order.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only approved Sales Orders can be delivered. Current status: {order.status}"
        )

    # Verify inventory is sufficient
    for item in order.items:
        inv_stmt = select(Inventory).where(
            Inventory.product_id == item.product_id,
            Inventory.warehouse_id == warehouse_id
        )
        inv_res = await db.execute(inv_stmt)
        inv = inv_res.scalars().first()

        if not inv or inv.available_stock < item.quantity:
            prod_name = item.product.name if item.product else "Unknown Product"
            available = inv.available_stock if inv else 0
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient inventory for {prod_name}. Available: {available}, Required: {item.quantity}"
            )

    # Perform stock deduction
    for item in order.items:
        inv_stmt = select(Inventory).where(
            Inventory.product_id == item.product_id,
            Inventory.warehouse_id == warehouse_id
        )
        inv_res = await db.execute(inv_stmt)
        inv = inv_res.scalars().first()

        inv.current_stock -= item.quantity
        inv.available_stock -= item.quantity

        # Write to inventory ledger
        ledger = InventoryLedger(
            product_id=item.product_id,
            warehouse_id=warehouse_id,
            transaction_type="OUT",
            quantity=item.quantity,
            reference_type="SALES_ORDER",
            reference_id=order.id,
            tenant_id=current_user.tenant_id,
            created_by=current_user.user_id
        )
        db.add(ledger)

    order.status = "completed"
    await db.commit()
    
    # Re-query order with selectinload to prevent lazy loading errors in response serialization
    stmt_order = select(SalesOrder).where(SalesOrder.id == order.id).options(
        selectinload(SalesOrder.items).selectinload(SalesOrderItem.product),
        selectinload(SalesOrder.customer)
    )
    res_order = await db.execute(stmt_order)
    order = res_order.scalars().first()

    # Trigger N8N webhook
    try:
        from app.modules.integrations.services import forward_webhook_to_n8n
        import asyncio
        asyncio.create_task(forward_webhook_to_n8n(
            tenant_id=current_user.tenant_id,
            event_name="sales_order.updated",
            data={
                "id": order.id,
                "so_number": order.so_number,
                "customer_email": order.customer.email,
                "status": order.status,
                "total_amount": float(order.total_amount)
            }
        ))
    except Exception:
        pass

    return order
