from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.modules.inventory.schemas import ProductResponse

# Purchase Order Item Schemas
class PurchaseOrderItemBase(BaseModel):
    product_id: str
    quantity: int = Field(..., ge=1)
    unit_cost: float = Field(..., ge=0.00)

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: str
    total_cost: float
    product: ProductResponse

    model_config = ConfigDict(from_attributes=True)

# Purchase Order Schemas
class PurchaseOrderBase(BaseModel):
    supplier_id: str
    status: str = Field("draft", max_length=50) # 'draft', 'submitted', 'approved', 'rejected', 'completed', 'cancelled'

class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    items: List[PurchaseOrderItemCreate] = Field(..., min_length=1)

class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[str] = None
    status: Optional[str] = None
    items: Optional[List[PurchaseOrderItemCreate]] = None

class PurchaseOrderStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status ('submitted', 'approved', 'rejected', 'completed', 'cancelled')")

# Import Supplier Response locally to avoid circular dependencies
from app.modules.suppliers.schemas import SupplierResponse

class PurchaseOrderResponse(PurchaseOrderBase):
    id: str
    po_number: str
    total_amount: float
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseOrderItemResponse] = []
    supplier: SupplierResponse

    model_config = ConfigDict(from_attributes=True)
