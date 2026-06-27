from pydantic import BaseModel, Field, ConfigDict
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

    model_config = ConfigDict(from_attributes=True)

class OrganizationAccessUpdate(BaseModel):
    suppliers: bool
    products: bool
    inventory: bool
    purchase_orders: bool
    finance: bool

class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    custom_domain: Optional[str] = None
    is_custom_domain: bool = False
    clerk_org_id: str
    status: str
    created_at: datetime
    access_config: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)

class PlatformAnalyticsResponse(BaseModel):
    total_organizations: int
    total_active_users: int
    total_suppliers: int
    total_purchase_orders: int
    total_payments: int
    total_inventory_items: int
    total_revenue: float
    total_documents_uploaded: int

class PlanCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    price: str = Field(..., min_length=1, max_length=50)
    period: Optional[str] = Field("/month", max_length=50)
    description: str = Field(..., max_length=512)
    features: list[str]
    popular: bool = False
    cta: str = Field("Start 14-Day Free Trial", max_length=100)
    trial_days: int = 14
    limits: Optional[dict] = None

class PlanUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    price: Optional[str] = Field(None, max_length=50)
    period: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=512)
    features: Optional[list[str]] = None
    popular: Optional[bool] = None
    cta: Optional[str] = Field(None, max_length=100)
    trial_days: Optional[int] = None
    limits: Optional[dict] = None

class PlanResponse(BaseModel):
    id: str
    name: str
    price: str
    period: Optional[str] = None
    description: str
    features: list[str]
    popular: bool
    cta: str
    trial_days: int
    limits: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserInviteRequest(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    tenant_id: str
    role: str

class UserResponse(BaseModel):
    id: str
    tenant_id: str
    clerk_user_id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    status: str = "active"
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- AUTH / REDIRECT SCHEMAS ---

class AuthMeResponse(BaseModel):
    """Returned by POST /auth/me — tells the frontend where to redirect."""
    user_id: str           # TiDB internal UUID
    clerk_user_id: str
    email: str
    role: str              # platform_admin | org:admin | org:member | etc.
    org_id: Optional[str] = None    # TiDB Organization.id (not Clerk org ID)
    org_slug: Optional[str] = None
    clerk_org_id: Optional[str] = None
    status: str = "active"
    is_platform_admin: bool = False


class ClerkSyncResult(BaseModel):
    """Summary returned by POST /admin/sync-clerk-users."""
    synced: int
    created: int
    updated: int
    skipped: int
    errors: int
    error_details: list[str] = []


class MakeAdminRequest(BaseModel):
    """Promote a Clerk user to platform_admin role."""
    clerk_user_id: str


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    expires_in_days: Optional[int] = Field(None, ge=1, description="Expiry duration in days")


class ApiKeyResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    key_prefix: str
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApiKeyCreatedResponse(ApiKeyResponse):
    key: str


class PlatformHistoryDataPoint(BaseModel):
    month: str
    organizations: int
    revenue: float


class PlatformHistoryResponse(BaseModel):
    history: list[PlatformHistoryDataPoint]


class AuditLogResponse(BaseModel):
    id: str
    tenant_id: str
    user_id: Optional[str] = None
    action: str
    target_table: str
    target_id: Optional[str] = None
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    ip_address: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationRequestCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    contact_person: str = Field(..., min_length=1, max_length=255)
    business_email: str = Field(..., min_length=1, max_length=255)
    phone_number: str = Field(..., min_length=1, max_length=50)
    industry: str = Field(..., min_length=1, max_length=100)
    company_size: str = Field(..., min_length=1, max_length=50)
    notes: Optional[str] = Field(None, max_length=1024)


class OrganizationRequestResponse(BaseModel):
    id: str
    company_name: str
    contact_person: str
    business_email: str
    phone_number: str
    industry: str
    company_size: str
    notes: Optional[str] = None
    status: str
    rejection_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationRequestAction(BaseModel):
    rejection_notes: Optional[str] = Field(None, max_length=1024)


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=512)


class DepartmentResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvitationCreate(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    role: str = Field(..., min_length=1, max_length=50)
    department_id: Optional[str] = Field(None, max_length=36)


class InvitationResponse(BaseModel):
    id: str
    tenant_id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    department_id: Optional[str] = None
    status: str
    token: str
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)




