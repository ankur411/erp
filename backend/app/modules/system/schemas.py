from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DocumentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    file_type: Optional[str] = Field(None, max_length=100)
    file_size: Optional[int] = Field(None, description="Size in bytes")
    reference_type: Optional[str] = Field(None, max_length=50, description="e.g. PURCHASE_ORDER")
    reference_id: Optional[str] = Field(None, max_length=36)

class PresignedUploadRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    content_type: Optional[str] = Field(None, max_length=100)

class PresignedUploadResponse(BaseModel):
    file_key: str
    upload_url: str

class DocumentResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    file_key: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TenantAccessUpdate(BaseModel):
    suppliers: bool
    products: bool
    inventory: bool
    purchase_orders: bool
    finance: bool

class TenantResponse(BaseModel):
    id: str
    name: str
    clerk_org_id: str
    status: str
    created_at: datetime
    access_config: Optional[dict] = None

    class Config:
        from_attributes = True
