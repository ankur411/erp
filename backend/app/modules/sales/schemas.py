from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class SalesOrderItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., ge=0.0)

class SalesOrderItemResponse(BaseModel):
    id: str
    product_id: str
    quantity: int
    unit_price: float
    total_price: float

    model_config = ConfigDict(from_attributes=True)

class SalesOrderCreate(BaseModel):
    customer_id: str
    items: List[SalesOrderItemCreate]

class SalesOrderUpdateStatus(BaseModel):
    status: str = Field(..., description="draft, approved, completed, cancelled")

class SalesOrderResponse(BaseModel):
    id: str
    so_number: str
    customer_id: str
    status: str
    total_amount: float
    created_by: Optional[str]
    created_at: datetime
    items: List[SalesOrderItemResponse]

    model_config = ConfigDict(from_attributes=True)

class SalesOrderListResponse(BaseModel):
    items: List[SalesOrderResponse]
    total: int
    page: int
    size: int
    pages: int
