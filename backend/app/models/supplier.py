import uuid
from typing import Optional
from sqlalchemy import String, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, HasTenant

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Supplier(Base, HasTenant):
    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    pan_number: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rating: Mapped[float] = mapped_column(Numeric(3, 2), default=5.00, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
