import uuid
from typing import Optional
from sqlalchemy import String, Numeric, Text, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, HasTenant

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Category(Base, HasTenant):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    products: Mapped[list["Product"]] = relationship("Product", back_populates="category")

class Product(Base, HasTenant):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("categories.id"), nullable=True)
    unit: Mapped[str] = mapped_column(String(50), default="pcs", nullable=False)
    cost_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    selling_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    reorder_level: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    category: Mapped[Optional[Category]] = relationship("Category", back_populates="products")
    inventory_items: Mapped[list["Inventory"]] = relationship("Inventory", back_populates="product", cascade="all, delete-orphan")

class Warehouse(Base, HasTenant):
    __tablename__ = "warehouses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)

    inventory_items: Mapped[list["Inventory"]] = relationship("Inventory", back_populates="warehouse", cascade="all, delete-orphan")

class Inventory(Base, HasTenant):
    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint("tenant_id", "product_id", "warehouse_id", name="uq_tenant_prod_wh"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)
    warehouse_id: Mapped[str] = mapped_column(String(36), ForeignKey("warehouses.id"), nullable=False)
    current_stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reserved_stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    available_stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product: Mapped[Product] = relationship("Product", back_populates="inventory_items")
    warehouse: Mapped[Warehouse] = relationship("Warehouse", back_populates="inventory_items")

class InventoryLedger(Base, HasTenant):
    __tablename__ = "inventory_ledger"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)
    warehouse_id: Mapped[str] = mapped_column(String(36), ForeignKey("warehouses.id"), nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False) # 'IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # 'PURCHASE_ORDER', 'INVOICE', 'MANUAL'
    reference_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
