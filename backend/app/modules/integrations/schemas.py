from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

class IntegrationConnectRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    type: str = Field("n8n", description="Type of external service, e.g. n8n")
    connection_method: str = Field(..., description="api or webhook")
    config: Dict[str, Any] = Field(default_factory=dict, description="Custom connector configurations")
    secrets: Dict[str, Any] = Field(default_factory=dict, description="Sensitive credentials (API keys, tokens)")

class IntegrationResponse(BaseModel):
    id: str
    name: str
    type: str
    connection_method: str
    config: Optional[Dict[str, Any]] = None
    is_active: bool
    status: str
    last_connected_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TestConnectionRequest(BaseModel):
    type: str = Field("n8n")
    config: Dict[str, Any]
    secrets: Dict[str, Any]

class TestConnectionResponse(BaseModel):
    success: bool
    error_message: Optional[str] = None

class WorkflowResponse(BaseModel):
    id: str
    name: str
    active: bool
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class WorkflowListResponse(BaseModel):
    workflows: List[WorkflowResponse]

class ManualImportRequest(BaseModel):
    target_type: str = Field(..., description="customers, suppliers, products, invoices, purchase_orders, payments, employees, attendance, documents")
    duplicate_strategy: str = Field("skip", description="skip or overwrite")
    workflow_id: Optional[str] = Field(None, description="Selected n8n workflow ID to execute")

class IntegrationSyncHistoryResponse(BaseModel):
    id: str
    integration_id: str
    target_type: str
    status: str
    records_processed: int
    records_created: int
    records_updated: int
    records_failed: int
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
