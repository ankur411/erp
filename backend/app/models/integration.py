import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, HasTenant

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Integration(Base, HasTenant):
    __tablename__ = "integrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False) # e.g. "My n8n API"
    type: Mapped[str] = mapped_column(String(50), default="n8n", nullable=False) # e.g. "n8n", "zoho"
    connection_method: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "api", "webhook"
    
    # Store settings like base_url, event_name, webhook_url, etc.
    config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Store encrypted credentials securely (like API keys, secret tokens)
    encrypted_secrets: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="connected", nullable=False) # connected, disconnected, error
    last_connected_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    sync_histories: Mapped[list["IntegrationSyncHistory"]] = relationship(
        "IntegrationSyncHistory", 
        back_populates="integration", 
        cascade="all, delete-orphan"
    )

class IntegrationSyncHistory(Base, HasTenant):
    __tablename__ = "integration_sync_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    integration_id: Mapped[str] = mapped_column(String(36), ForeignKey("integrations.id", ondelete="CASCADE"), nullable=False)
    target_type: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "customers", "suppliers", "products"
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False) # pending, success, failed, rolled_back
    
    records_processed: Mapped[int] = mapped_column(default=0, nullable=False)
    records_created: Mapped[int] = mapped_column(default=0, nullable=False)
    records_updated: Mapped[int] = mapped_column(default=0, nullable=False)
    records_failed: Mapped[int] = mapped_column(default=0, nullable=False)
    
    # Stores detail audit for rollback capabilities:
    # {"created_ids": ["uuid-1", "uuid-2"], "updated_original_values": {"uuid-3": {"field1": "val1"}}}
    sync_details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    error_message: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    integration: Mapped[Integration] = relationship("Integration", back_populates="sync_histories")

class Customer(Base, HasTenant):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

class Employee(Base, HasTenant):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    department_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

class Attendance(Base, HasTenant):
    __tablename__ = "attendance"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    employee_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    date: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "2026-06-27"
    check_in: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # e.g. "09:00:00"
    check_out: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # e.g. "17:00:00"
    status: Mapped[str] = mapped_column(String(50), default="present", nullable=False) # present, absent, late, leave
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
