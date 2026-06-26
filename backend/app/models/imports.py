import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, HasTenant

def generate_uuid() -> str:
    return str(uuid.uuid4())

class ImportJob(Base, HasTenant):
    __tablename__ = "import_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False) # "suppliers" or "products"
    status: Mapped[str] = mapped_column(String(50), default="preview", nullable=False) # "preview", "processing", "completed", "failed", "rolled_back"
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    processed_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    payload: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True) # Stores parsed records for confirmation
    options: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True) # e.g. {"on_duplicate": "skip" | "overwrite" | "error"}

    logs: Mapped[list["ImportLog"]] = relationship("ImportLog", back_populates="job", cascade="all, delete-orphan")

class ImportLog(Base, HasTenant):
    __tablename__ = "import_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    import_job_id: Mapped[str] = mapped_column(String(36), ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False) # "success", "skipped", "error"
    message: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    imported_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True) # ID of the imported entity for rollback
    original_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True) # For previewing errors or debug

    job: Mapped[ImportJob] = relationship("ImportJob", back_populates="logs")
