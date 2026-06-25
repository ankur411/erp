from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, date
from app.modules.purchase.schemas import PurchaseOrderResponse

# Payment Schemas
class PaymentBase(BaseModel):
    amount: float = Field(..., ge=0.01)
    payment_method: str = Field(..., description="BANK_TRANSFER, CASH, CREDIT_CARD, ACH")
    transaction_reference: Optional[str] = Field(None, max_length=255)

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: str
    invoice_id: str
    status: str
    paid_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Invoice Schemas
class InvoiceBase(BaseModel):
    purchase_order_id: str
    subtotal: float = Field(..., ge=0.00)
    cgst: float = Field(0.00, ge=0.00)
    sgst: float = Field(0.00, ge=0.00)
    igst: float = Field(0.00, ge=0.00)
    due_date: date

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceResponse(InvoiceBase):
    id: str
    invoice_number: str
    status: str # 'unpaid', 'partially_paid', 'paid', 'overdue', 'void'
    total_amount: float
    tenant_id: str
    created_at: datetime
    purchase_order: PurchaseOrderResponse
    payments: List[PaymentResponse] = []

    model_config = ConfigDict(from_attributes=True)
