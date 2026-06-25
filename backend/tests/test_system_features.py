import pytest
from sqlalchemy import select
from app.models.system import Tenant, User, Document, Plan
from app.models.supplier import Supplier
from app.models.purchase import PurchaseOrder
from app.models.finance import Payment
from app.models.inventory import Inventory, Product, Warehouse
from app.core.auth import require_auth, UserSession
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
    tenant_a = Tenant(name="Tenant A", clerk_org_id="org_a", status="active")
    tenant_b = Tenant(name="Tenant B", clerk_org_id="org_b", status="active")
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
    tenant = Tenant(name="Invite Org", clerk_org_id="org_invite_123", status="active")
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
async def test_list_users(client, db_session):
    """
    Test listing all platform users (Admin-only).
    """
    # 1. Setup active user
    tenant = Tenant(name="List Org", clerk_org_id="org_list_123", status="active")
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

