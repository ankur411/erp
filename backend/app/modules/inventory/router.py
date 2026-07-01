from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.core.auth import require_auth, require_org, RequireRole, UserSession
from app.models.inventory import Category, Product, Warehouse, Inventory, InventoryLedger
from app.modules.inventory.schemas import (
    CategoryCreate, CategoryResponse,
    ProductCreate, ProductUpdate, ProductResponse,
    WarehouseCreate, WarehouseResponse,
    InventoryResponse, StockAdjustmentRequest, InventoryLedgerResponse
)

router = APIRouter(tags=["Inventory & Catalog"])

# Security roles
require_viewer = Depends(RequireRole(["Viewer", "Employee"]))
require_warehouse_manager = Depends(RequireRole(["Warehouse Manager", "Organization Owner", "Super Admin"]))
require_admin = Depends(RequireRole(["Organization Owner", "Super Admin"]))

# --- CATEGORIES ---
@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED, dependencies=[require_warehouse_manager])
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    db_obj = Category(**category_in.model_dump(), tenant_id=current_user.tenant_id, created_by=current_user.user_id)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("/categories", response_model=List[CategoryResponse], dependencies=[require_viewer])
async def list_categories(db: AsyncSession = Depends(get_db)):
    stmt = select(Category).order_by(Category.name)
    res = await db.execute(stmt)
    return res.scalars().all()


# --- PRODUCTS ---
@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, dependencies=[require_warehouse_manager])
async def create_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    # Check if SKU exists
    existing = await db.execute(select(Product).where(Product.sku == product_in.sku))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SKU already exists in the catalog."
        )
        
    db_obj = Product(
        **product_in.model_dump(),
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
            event_name="product.created",
            data={
                "id": db_obj.id,
                "sku": db_obj.sku,
                "name": db_obj.name,
                "selling_price": float(db_obj.selling_price)
            }
        ))
    except Exception:
        pass

    return db_obj

@router.get("/products", response_model=List[ProductResponse], dependencies=[require_viewer])
async def list_products(
    search: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Product).options(selectinload(Product.category))
    if search:
        stmt = stmt.where(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%")
            )
        )
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)

    res = await db.execute(stmt.order_by(Product.name))
    return res.scalars().all()

@router.get("/products/sku/{sku}", response_model=ProductResponse, dependencies=[require_viewer])
async def get_product_by_sku(sku: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Product).where(Product.sku == sku).options(selectinload(Product.category))
    res = await db.execute(stmt)
    product = res.scalars().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found by SKU.")
    return product

@router.patch("/products/{product_id}", response_model=ProductResponse, dependencies=[require_warehouse_manager])
async def update_product(
    product_id: str,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Product).where(Product.id == product_id)
    res = await db.execute(stmt)
    db_obj = res.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    update_data = product_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(db_obj, field, val)

    await db.commit()
    await db.refresh(db_obj)

    try:
        from app.modules.integrations.services import forward_webhook_to_n8n
        import asyncio
        asyncio.create_task(forward_webhook_to_n8n(
            tenant_id=db_obj.tenant_id,
            event_name="product.updated",
            data={
                "id": db_obj.id,
                "sku": db_obj.sku,
                "name": db_obj.name,
                "selling_price": float(db_obj.selling_price)
            }
        ))
    except Exception:
        pass

    return db_obj


# --- WAREHOUSES ---
@router.post("/warehouses", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED, dependencies=[require_warehouse_manager])
async def create_warehouse(
    warehouse_in: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    db_obj = Warehouse(
        **warehouse_in.model_dump(),
        tenant_id=current_user.tenant_id,
        created_by=current_user.user_id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("/warehouses", response_model=List[WarehouseResponse], dependencies=[require_viewer])
async def list_warehouses(db: AsyncSession = Depends(get_db)):
    stmt = select(Warehouse).order_by(Warehouse.name)
    res = await db.execute(stmt)
    return res.scalars().all()


# --- INVENTORY LEVELS & ADJUSTMENTS ---
@router.get("/inventory", response_model=List[InventoryResponse], dependencies=[require_viewer])
async def list_inventory(
    warehouse_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    alerts_only: bool = Query(False, description="Filter for products running below reorder levels"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Inventory).options(
        selectinload(Inventory.product).selectinload(Product.category),
        selectinload(Inventory.warehouse)
    )
    if warehouse_id:
        stmt = stmt.where(Inventory.warehouse_id == warehouse_id)
    if product_id:
        stmt = stmt.where(Inventory.product_id == product_id)
        
    res = await db.execute(stmt)
    items = res.scalars().all()

    if alerts_only:
        # Filter items where available stock is below or equal to reorder level
        items = [i for i in items if i.available_stock <= i.product.reorder_level]
        
    return items

@router.post("/inventory/adjust", response_model=InventoryResponse, dependencies=[require_warehouse_manager])
async def adjust_stock(
    adj: StockAdjustmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Perform manual stock adjustments. Positive quantity adds stock; negative subtracts stock.
    Creates a corresponding record in the Inventory Ledger.
    """
    # 1. Fetch/Create Inventory record
    stmt = select(Inventory).where(
        Inventory.product_id == adj.product_id,
        Inventory.warehouse_id == adj.warehouse_id
    ).options(
        selectinload(Inventory.product),
        selectinload(Inventory.warehouse)
    )
    res = await db.execute(stmt)
    inv = res.scalars().first()

    if not inv:
        # If record doesn't exist and we want to subtract stock, that is invalid
        if adj.quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot subtract stock. No inventory record exists for this item in the selected warehouse."
            )
        # Create new record
        inv = Inventory(
            product_id=adj.product_id,
            warehouse_id=adj.warehouse_id,
            current_stock=0,
            reserved_stock=0,
            available_stock=0,
            tenant_id=current_user.tenant_id,
            created_by=current_user.user_id
        )
        db.add(inv)
        # We need to refresh to get relationships if loaded, but let's do it after committing or by manual loading
        # Let's commit and query again
        
    # Check if we have enough stock to subtract
    if adj.quantity < 0 and inv.available_stock + adj.quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. Available: {inv.available_stock}, Request adjustment: {adj.quantity}"
        )

    # Perform stock adjustment
    inv.current_stock += adj.quantity
    inv.available_stock += adj.quantity

    # Create Inventory Ledger entry
    ledger_entry = InventoryLedger(
        product_id=adj.product_id,
        warehouse_id=adj.warehouse_id,
        transaction_type="ADJUSTMENT",
        quantity=adj.quantity,
        reference_type="MANUAL",
        reference_id=current_user.user_id, # User who performed it
        tenant_id=current_user.tenant_id,
        created_by=current_user.user_id
    )
    db.add(ledger_entry)
    
    await db.commit()
    
    # Reload inventory record to return with all loaded relationships
    stmt_reload = select(Inventory).where(
        Inventory.id == inv.id
    ).options(
        selectinload(Inventory.product).selectinload(Product.category),
        selectinload(Inventory.warehouse)
    )
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalars().one()
