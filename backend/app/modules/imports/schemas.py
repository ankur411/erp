from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class ImportConfirmRequest(BaseModel):
    on_duplicate: str = Field(default="skip", description="Strategy for duplicate records: 'skip', 'overwrite', 'error'")

class ImportLogResponse(BaseModel):
    id: str
    row_number: int
    status: str
    message: Optional[str] = None
    imported_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ImportJobResponse(BaseModel):
    id: str
    target_type: str
    status: str
    file_name: str
    total_rows: int
    processed_rows: int
    error_rows: int
    created_at: datetime
    logs: Optional[List[ImportLogResponse]] = None

    model_config = ConfigDict(from_attributes=True)

class ImportPreviewRow(BaseModel):
    row_number: int
    raw_data: Dict[str, Any]
    mapped_data: Dict[str, Any]
    is_valid: bool
    is_duplicate: bool
    error_message: Optional[str] = None

class ImportPreviewResponse(BaseModel):
    job_id: str
    total_rows: int
    preview_rows: List[ImportPreviewRow]
