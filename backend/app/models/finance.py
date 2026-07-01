import uuid
from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import String, Numeric, ForeignKey, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, HasTenant

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

class Invoice(Base, HasTenant):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    invoice_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    purchase_order_id: Mapped[str] = mapped_column(String(36), ForeignKey("purchase_orders.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="unpaid", nullable=False) # 'unpaid', 'partially_paid', 'paid', 'overdue', 'void'
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    cgst: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    sgst: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    igst: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="invoices")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")

class Payment(Base, HasTenant):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False) # 'BANK_TRANSFER', 'CASH', 'CREDIT_CARD', 'ACH'
    status: Mapped[str] = mapped_column(String(50), default="completed", nullable=False)
    transaction_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    paid_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    invoice: Mapped[Invoice] = relationship("Invoice", back_populates="payments")

# Late Import Fixes for type annotations
from app.models.purchase import PurchaseOrder
