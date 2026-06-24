from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime

class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    company_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    gst_number: Optional[str] = Field(None, max_length=15)
    pan_number: Optional[str] = Field(None, max_length=10)
    contact_person: Optional[str] = Field(None, max_length=255)
    rating: float = Field(5.00, ge=0.00, le=5.00)
    status: str = Field("active", max_length=50)
    notes: Optional[str] = None

    @field_validator("gst_number")
    @classmethod
    def validate_gst(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) != 15:
            raise ValueError("GST number must be exactly 15 characters.")
        return v

    @field_validator("pan_number")
    @classmethod
    def validate_pan(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) != 10:
            raise ValueError("PAN number must be exactly 10 characters.")
        return v

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    gst_number: Optional[str] = Field(None, max_length=15)
    pan_number: Optional[str] = Field(None, max_length=10)
    contact_person: Optional[str] = Field(None, max_length=255)
    rating: Optional[float] = Field(None, ge=0.00, le=5.00)
    status: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None

class SupplierResponse(SupplierBase):
    id: str
    tenant_id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SupplierListResponse(BaseModel):
    items: List[SupplierResponse]
    total: int
    page: int
    size: int
    pages: int
