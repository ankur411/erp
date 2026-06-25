from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime

# Category Schemas
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Product Schemas
class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit: str = Field("pcs", max_length=50)
    cost_price: float = Field(..., ge=0.00)
    selling_price: float = Field(..., ge=0.00)
    reorder_level: int = Field(10, ge=0)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit: Optional[str] = Field(None, max_length=50)
    cost_price: Optional[float] = Field(None, ge=0.00)
    selling_price: Optional[float] = Field(None, ge=0.00)
    reorder_level: Optional[int] = Field(None, ge=0)

class ProductResponse(ProductBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None

    model_config = ConfigDict(from_attributes=True)

# Warehouse Schemas
class WarehouseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    location: Optional[str] = None
    status: str = Field("active", max_length=50)

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseResponse(WarehouseBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Inventory Schemas
class InventoryResponse(BaseModel):
    id: str
    tenant_id: str
    product_id: str
    warehouse_id: str
    current_stock: int
    reserved_stock: int
    available_stock: int
    product: ProductResponse
    warehouse: WarehouseResponse

    model_config = ConfigDict(from_attributes=True)

# Inventory Stock Adjustments
class StockAdjustmentRequest(BaseModel):
    product_id: str
    warehouse_id: str
    quantity: int = Field(..., description="Positive to add stock, negative to subtract stock")
    reason: str = Field(..., min_length=3, max_length=255)

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v == 0:
            raise ValueError("Quantity cannot be zero.")
        return v

# Inventory Ledger Schemas
class InventoryLedgerResponse(BaseModel):
    id: str
    tenant_id: str
    product_id: str
    warehouse_id: str
    transaction_type: str # IN, OUT, TRANSFER, ADJUSTMENT
    quantity: int
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
