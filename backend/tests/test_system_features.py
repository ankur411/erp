import pytest
from sqlalchemy import select
from app.models.system import (
    Organization, User, Document, Plan, ApiKey,
    OrganizationRequest, OrganizationDepartment, OrganizationInvitation
)
from app.models.supplier import Supplier
from app.models.purchase import PurchaseOrder
from app.models.finance import Payment
from app.models.inventory import Inventory, Product, Warehouse
from app.core.auth import require_auth, require_org, UserSession
from app.main import app

# Mock auth dependency for tests
async def mock_require_auth():
    return UserSession(
        user_id="usr_admin",
        email="admin@test.com",
        tenant_id=None,
        role="org:admin"
    )

@pytest.mark.asyncio
async def test_get_platform_analytics(client, db_session):
    """
    Test that the platform analytics endpoint correctly aggregates counts across all tenants.
    """
    # 1. Setup mock data
    tenant_a = Organization(name="Tenant A", slug="tenant-a", clerk_org_id="org_a", status="active")
    tenant_b = Organization(name="Tenant B", slug="tenant-b", clerk_org_id="org_b", status="active")
    db_session.add_all([tenant_a, tenant_b])
    await db_session.commit()
    await db_session.refresh(tenant_a)
    await db_session.refresh(tenant_b)

    # Add users
    user_1 = User(tenant_id=tenant_a.id, clerk_user_id="user_1", email="u1@test.com", role="Employee")
    user_2 = User(tenant_id=tenant_b.id, clerk_user_id="user_2", email="u2@test.com", role="Employee")
    db_session.add_all([user_1, user_2])

    # Add suppliers
    sup_1 = Supplier(tenant_id=tenant_a.id, name="Sup 1", company_name="Corp 1", email="s1@test.com")
    sup_2 = Supplier(tenant_id=tenant_b.id, name="Sup 2", company_name="Corp 2", email="s2@test.com")
    db_session.add_all([sup_1, sup_2])
    await db_session.commit()
    await db_session.refresh(sup_1)
    await db_session.refresh(sup_2)

    # Add purchase orders
    po_1 = PurchaseOrder(tenant_id=tenant_a.id, po_number="PO-001", supplier_id=sup_1.id, status="submitted", total_amount=1500.0)
    db_session.add(po_1)

    # Add documents
    doc_1 = Document(tenant_id=tenant_a.id, name="doc1.pdf", file_key="tenants/a/docs/doc1.pdf")
    db_session.add(doc_1)

    await db_session.commit()

    # 2. Call endpoint
    response = await client.get("/api/v1/system/analytics")
    assert response.status_code == 200
    data = response.json()

    assert data["total_organizations"] >= 2
    assert data["total_active_users"] >= 2
    assert data["total_suppliers"] >= 2
    assert data["total_purchase_orders"] >= 1
    assert data["total_documents_uploaded"] >= 1

@pytest.mark.asyncio
async def test_plans_crud(client):
    """
    Test CRUD operations for dynamic pricing plans.
    """
    # Override auth to represent authenticated admin
    app.dependency_overrides[require_auth] = mock_require_auth

    # 1. Create a plan
    payload = {
        "name": "Enterprise Test",
        "price": "₹29,999",
        "period": "/month",
        "description": "High end testing tier",
        "features": ["All Features", "24/7 SLA Support"],
        "popular": False,
        "cta": "Contact Support",
        "trial_days": 30,
        "limits": {"warehouses": 99}
    }
    response = await client.post("/api/v1/system/plans", json=payload)
    assert response.status_code == 201
    created_data = response.json()
    assert created_data["name"] == "Enterprise Test"
    plan_id = created_data["id"]

    # 2. Read plans
    get_response = await client.get("/api/v1/system/plans")
    assert get_response.status_code == 200
    plans_list = get_response.json()
    assert len(plans_list) >= 1
    names = [p["name"] for p in plans_list]
    assert "Enterprise Test" in names

    # 3. Update plan
    update_payload = {
        "price": "₹34,999",
        "popular": True
    }
    put_response = await client.put(f"/api/v1/system/plans/{plan_id}", json=update_payload)
    assert put_response.status_code == 200
    updated_data = put_response.json()
    assert updated_data["price"] == "₹34,999"
    assert updated_data["popular"] is True

    # 4. Delete plan
    del_response = await client.delete(f"/api/v1/system/plans/{plan_id}")
    assert del_response.status_code == 200
    assert del_response.json()["status"] == "success"

    # Verify deletion
    get_response_2 = await client.get("/api/v1/system/plans")
    plans_list_2 = get_response_2.json()
    assert plan_id not in [p["id"] for p in plans_list_2]

    # Clear overrides
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_invite_user(client, db_session):
    """
    Test user invitation workflow creates DB records and returns temp password.
    """
    # Override auth to represent authenticated admin
    app.dependency_overrides[require_auth] = mock_require_auth

    # Create a tenant
    tenant = Organization(name="Invite Org", slug="invite-org", clerk_org_id="org_invite_123", status="active")
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)

    payload = {
        "email": "invited_user@test.com",
        "first_name": "Jane",
        "last_name": "Doe",
        "tenant_id": tenant.id,
        "role": "Procurement Manager"
    }

    # Invite user
    from app.config import settings
    original_key = settings.CLERK_SECRET_KEY
    settings.CLERK_SECRET_KEY = "mock_secret_key"
    try:
        response = await client.post("/api/v1/system/users/invite", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "success"
        assert "temp_password" in data
        assert "clerk_user_id" in data
    finally:
        settings.CLERK_SECRET_KEY = original_key

    # Verify in DB
    stmt = select(User).where(User.email == "invited_user@test.com")
    res = await db_session.execute(stmt)
    db_user = res.scalars().first()
    assert db_user is not None
    assert db_user.tenant_id == tenant.id
    assert db_user.role == "Procurement Manager"

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_invite_platform_admin(client, db_session):
    """
    Test platform admin invitation workflow does not require a tenant organization
    and successfully registers the user in local DB with tenant_id set to None.
    """
    app.dependency_overrides[require_auth] = mock_require_auth

    payload = {
        "email": "invited_admin@test.com",
        "first_name": "Platform",
        "last_name": "Admin",
        "tenant_id": "system",
        "role": "platform_admin"
    }

    from app.config import settings
    original_key = settings.CLERK_SECRET_KEY
    settings.CLERK_SECRET_KEY = "mock_secret_key"
    try:
        response = await client.post("/api/v1/system/users/invite", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "success"
        assert "temp_password" in data
        assert "clerk_user_id" in data
    finally:
        settings.CLERK_SECRET_KEY = original_key

    # Verify in DB that tenant_id is indeed None
    stmt = select(User).where(User.email == "invited_admin@test.com")
    res = await db_session.execute(stmt)
    db_user = res.scalars().first()
    assert db_user is not None
    assert db_user.tenant_id is None
    assert db_user.role == "platform_admin"

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_list_users(client, db_session):
    """
    Test listing all platform users (Admin-only).
    """
    # 1. Setup active user
    tenant = Organization(name="List Org", slug="list-org", clerk_org_id="org_list_123", status="active")
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)

    user = User(
        tenant_id=tenant.id,
        clerk_user_id="user_list_123",
        email="listed_user@test.com",
        first_name="Jane",
        last_name="Doe",
        role="Employee"
    )
    db_session.add(user)
    await db_session.commit()

    # 2. Call without authentication (expect 401/403)
    response = await client.get("/api/v1/system/users")
    assert response.status_code in [401, 403]

    # 3. Call with auth (expect 200 and listed user)
    app.dependency_overrides[require_auth] = mock_require_auth
    try:
        response2 = await client.get("/api/v1/system/users")
        assert response2.status_code == 200
        data = response2.json()
        assert len(data) >= 1
        emails = [u["email"] for u in data]
        assert "listed_user@test.com" in emails
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_key_lifecycle(client, db_session):
    """
    Test the complete lifecycle of API keys: creation, listing, authentication, and revocation.
    """
    # 1. Create a dummy organization
    org = Organization(name="API Key Org", slug="api-key-org", clerk_org_id="org_api_key_123", status="active")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    # Mock require_org to represent an admin user in this org
    async def mock_require_org_api_key():
        return UserSession(
            user_id="usr_admin",
            email="admin@api-key.com",
            tenant_id=org.clerk_org_id,
            role="org:admin"
        )

    # 2. Generate API Key (admin authenticates via Clerk first)
    app.dependency_overrides[require_org] = mock_require_org_api_key
    
    create_payload = {
        "name": "Integration Test Key",
        "expires_in_days": 30
    }
    
    response = await client.post("/api/v1/system/api-keys", json=create_payload)
    assert response.status_code == 201
    created_data = response.json()
    
    assert created_data["name"] == "Integration Test Key"
    assert created_data["tenant_id"] == org.clerk_org_id
    assert created_data["key"].startswith("sk_live_")
    assert created_data["key_prefix"] == created_data["key"][:14]
    
    raw_key = created_data["key"]
    key_id = created_data["id"]

    # 3. List API Keys and verify they exist (but plain text key is NOT returned)
    list_response = await client.get("/api/v1/system/api-keys")
    assert list_response.status_code == 200
    list_data = list_response.json()
    assert len(list_data) == 1
    assert list_data[0]["id"] == key_id
    assert "key" not in list_data[0] # Plain text key is never shown again!

    # 4. Authenticate using the generated API Key
    # Clear mock overrides so we test real authentication via X-API-Key header
    app.dependency_overrides.clear()

    # Pass the API key to a route that requires organization context
    # Use headers to pass the API Key and the tenant slug (to resolve organization context)
    headers = {
        "X-API-Key": raw_key,
        "X-Tenant-Slug": "api-key-org"
    }
    
    # We should be able to query the API keys using the API Key itself!
    auth_response = await client.get("/api/v1/system/api-keys", headers=headers)
    assert auth_response.status_code == 200
    auth_data = auth_response.json()
    assert len(auth_data) == 1
    assert auth_data[0]["id"] == key_id

    # 5. Verify invalid API key returns 401
    bad_headers = {
        "X-API-Key": "sk_live_invalidkeyhere",
        "X-Tenant-Slug": "api-key-org"
    }
    bad_response = await client.get("/api/v1/system/api-keys", headers=bad_headers)
    assert bad_response.status_code == 401
    assert bad_response.json()["detail"] == "Invalid API Key."

    # 6. Revoke (Delete) the API Key
    # Re-apply mock so we can perform administrative delete
    app.dependency_overrides[require_org] = mock_require_org_api_key
    del_response = await client.delete(f"/api/v1/system/api-keys/{key_id}")
    assert del_response.status_code == 204

    # 7. Verify revoked API key can no longer be used to authenticate
    app.dependency_overrides.clear()
    revoked_response = await client.get("/api/v1/system/api-keys", headers=headers)
    assert revoked_response.status_code == 401


@pytest.mark.asyncio
async def test_platform_analytics_history_and_audit_logs(client, db_session):
    """
    Test platform-wide analytics history and audit logs endpoints.
    """
    # 1. Setup mock auth dependency to represent platform admin
    app.dependency_overrides[require_auth] = mock_require_auth

    try:
        # Create a tenant and some payments/audit logs
        tenant = Organization(name="History Org", slug="history-org", clerk_org_id="org_hist_123", status="active")
        db_session.add(tenant)
        await db_session.commit()
        await db_session.refresh(tenant)

        # Call analytics history
        response = await client.get("/api/v1/system/analytics/history")
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert len(data["history"]) > 0

        # Call audit logs
        response_logs = await client.get("/api/v1/system/audit-logs?limit=10")
        assert response_logs.status_code == 200
        logs = response_logs.json()
        assert isinstance(logs, list)

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_organization_requests_flow(client, db_session):
    """
    Test organization request creation, listing, approval, and rejection.
    """
    app.dependency_overrides[require_auth] = mock_require_auth

    try:
        # 1. Create a request
        payload = {
            "company_name": "Acme Test Inc",
            "contact_person": "John Doe",
            "business_email": "john.doe@acmetest.com",
            "phone_number": "+1234567890",
            "industry": "Manufacturing",
            "company_size": "50-100",
            "notes": "Testing organization request onboarding."
        }
        response = await client.post("/api/v1/system/organization-requests", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["company_name"] == "Acme Test Inc"
        assert data["status"] == "pending"
        request_id = data["id"]

        # 2. List requests
        list_resp = await client.get("/api/v1/system/organization-requests")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert len(list_data) >= 1
        assert any(r["id"] == request_id for r in list_data)

        # 3. Approve request
        approve_resp = await client.post(f"/api/v1/system/organization-requests/{request_id}/approve")
        assert approve_resp.status_code == 200
        approve_data = approve_resp.json()
        assert approve_data["status"] == "approved"

        # Verify Organization was created
        org_stmt = select(Organization).where(Organization.name == "Acme Test Inc")
        org_res = await db_session.execute(org_stmt)
        org = org_res.scalars().first()
        assert org is not None
        assert org.status == "active"

        # Verify User was linked/created as Super Admin
        user_stmt = select(User).where(User.email == "john.doe@acmetest.com")
        user_res = await db_session.execute(user_stmt)
        user = user_res.scalars().first()
        assert user is not None
        assert user.tenant_id == org.id
        assert user.role == "Super Admin"

        # 4. Test rejection flow (create another request and reject it)
        payload2 = {
            "company_name": "Reject Corp",
            "contact_person": "Bad Actor",
            "business_email": "bad@reject.com",
            "phone_number": "0000000000",
            "industry": "Other",
            "company_size": "1-10",
            "notes": "Please reject me."
        }
        resp2 = await client.post("/api/v1/system/organization-requests", json=payload2)
        assert resp2.status_code == 201
        req2_id = resp2.json()["id"]

        reject_payload = {"rejection_notes": "Not a valid business."}
        reject_resp = await client.post(f"/api/v1/system/organization-requests/{req2_id}/reject", json=reject_payload)
        assert reject_resp.status_code == 200
        reject_data = reject_resp.json()
        assert reject_data["status"] == "rejected"
        assert reject_data["rejection_notes"] == "Not a valid business."

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_departments_crud_flow(client, db_session):
    """
    Test department CRUD endpoints.
    """
    # 1. Create a dummy organization
    org = Organization(name="Dept Org", slug="dept-org", clerk_org_id="org_dept_123", status="active")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    async def mock_require_org_dept():
        return UserSession(
            user_id="usr_admin",
            email="admin@dept.com",
            tenant_id=org.id,
            role="org:admin"
        )

    app.dependency_overrides[require_org] = mock_require_org_dept

    try:
        # Create department
        payload = {
            "name": "Engineering",
            "description": "Tech and product team"
        }
        resp = await client.post("/api/v1/system/organizations/departments", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Engineering"
        dept_id = data["id"]

        # List departments
        list_resp = await client.get("/api/v1/system/organizations/departments")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert len(list_data) == 1
        assert list_data[0]["id"] == dept_id

        # Update department
        update_payload = {
            "name": "R&D Team",
            "description": "Research and development"
        }
        up_resp = await client.put(f"/api/v1/system/organizations/departments/{dept_id}", json=update_payload)
        assert up_resp.status_code == 200
        assert up_resp.json()["name"] == "R&D Team"

        # Delete department
        del_resp = await client.delete(f"/api/v1/system/organizations/departments/{dept_id}")
        assert del_resp.status_code == 204

        # Verify deletion
        list_resp2 = await client.get("/api/v1/system/organizations/departments")
        assert len(list_resp2.json()) == 0

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_invitations_lifecycle_flow(client, db_session):
    """
    Test creation, listing, and revoking of organization invitations.
    """
    org = Organization(name="Invite Flow Org", slug="invite-flow-org", clerk_org_id="org_invite_flow_123", status="active")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    async def mock_require_org_invite():
        return UserSession(
            user_id="usr_admin",
            email="admin@inviteflow.com",
            tenant_id=org.id,
            role="org:admin"
        )

    app.dependency_overrides[require_org] = mock_require_org_invite

    from app.config import settings
    original_key = settings.CLERK_SECRET_KEY
    settings.CLERK_SECRET_KEY = "mock_secret_key"
    try:
        # Create invitation
        payload = {
            "email": "invitee@test.com",
            "first_name": "Alice",
            "last_name": "Smith",
            "role": "Employee",
            "department_id": None
        }
        resp = await client.post("/api/v1/system/organizations/invitations", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "invitee@test.com"
        assert data["status"] == "pending"
        inv_id = data["id"]

        # Verify User was pre-created in local DB
        user_stmt = select(User).where(User.email == "invitee@test.com")
        user_res = await db_session.execute(user_stmt)
        assert user_res.scalars().first() is not None

        # List invitations
        list_resp = await client.get("/api/v1/system/organizations/invitations")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert len(list_data) == 1
        assert list_data[0]["id"] == inv_id

        # Revoke invitation
        revoke_resp = await client.delete(f"/api/v1/system/organizations/invitations/{inv_id}")
        assert revoke_resp.status_code == 204

        # Verify revoked status in DB
        inv_stmt = select(OrganizationInvitation).where(OrganizationInvitation.id == inv_id)
        inv_res = await db_session.execute(inv_stmt)
        assert inv_res.scalars().first().status == "revoked"

    finally:
        settings.CLERK_SECRET_KEY = original_key
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_local_user_updates_and_deletion(client, db_session):
    """
    Test updating and deleting user accounts locally (platform admin functionality).
    """
    # 1. Create a user to test updates and delete on
    target_user = User(
        clerk_user_id="user_target_999",
        email="target_user@test.com",
        first_name="Target",
        last_name="User",
        role="org:member",
        status="active"
    )
    db_session.add(target_user)
    await db_session.commit()
    await db_session.refresh(target_user)

    # 2. Mock a platform admin session
    async def mock_platform_admin_auth():
        return UserSession(
            user_id="usr_admin_111",
            email="admin@test.com",
            tenant_id=None,
            role="platform_admin"
        )

    # We also need an admin user in the database with role 'platform_admin' and clerk_user_id matching user_id
    admin_user = User(
        clerk_user_id="usr_admin_111",
        email="admin@test.com",
        first_name="Platform",
        last_name="Admin",
        role="platform_admin",
        status="active"
    )
    db_session.add(admin_user)
    await db_session.commit()

    app.dependency_overrides[require_auth] = mock_platform_admin_auth

    try:
        # 3. Perform patch update
        update_payload = {
            "first_name": "UpdatedTarget",
            "last_name": "UpdatedUser",
            "role": "org:admin",
            "status": "suspended"
        }
        resp = await client.patch(f"/api/v1/system/users/{target_user.id}", json=update_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_name"] == "UpdatedTarget"
        assert data["last_name"] == "UpdatedUser"
        assert data["role"] == "org:admin"
        assert data["status"] == "suspended"

        # Verify in DB
        stmt = select(User).where(User.id == target_user.id)
        res = await db_session.execute(stmt)
        db_user = res.scalars().first()
        assert db_user.first_name == "UpdatedTarget"
        assert db_user.role == "org:admin"
        assert db_user.status == "suspended"

        # 4. Delete the user
        del_resp = await client.delete(f"/api/v1/system/users/{target_user.id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "success"

        # Verify deletion in DB
        res2 = await db_session.execute(stmt)
        assert res2.scalars().first() is None

    finally:
        app.dependency_overrides.clear()



