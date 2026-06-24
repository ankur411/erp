import pytest
from sqlalchemy import select
from app.database import tenant_context, user_context
from app.models.supplier import Supplier
from app.core.auth import require_org, UserSession
from app.main import app

# Mock auth dependency for Tenant A
async def mock_require_org_tenant_a():
    tenant_context.set("tenant_a")
    user_context.set("usr_a")
    return UserSession(
        user_id="usr_a",
        tenant_id="tenant_a",
        email="user_a@test.com",
        role="org:admin"
    )

# Mock auth dependency for Tenant B
async def mock_require_org_tenant_b():
    tenant_context.set("tenant_b")
    user_context.set("usr_b")
    return UserSession(
        user_id="usr_b",
        tenant_id="tenant_b",
        email="user_b@test.com",
        role="org:admin"
    )

@pytest.mark.asyncio
async def test_tenant_isolation_database_level(db_session):
    """
    Test that database queries are automatically filtered by tenant_id.
    """
    # 1. Create a supplier under Tenant A
    tenant_context.set("tenant_a")
    sup_a = Supplier(
        tenant_id="tenant_a",
        name="Tenant A Supplier",
        company_name="Tenant A Corp",
        email="contact@tenanta.com",
        phone="12345",
        gst_number="123456789012345",
        pan_number="ABCDE1234F",
        contact_person="Person A"
    )
    db_session.add(sup_a)
    await db_session.commit()

    # 2. Create a supplier under Tenant B
    tenant_context.set("tenant_b")
    sup_b = Supplier(
        tenant_id="tenant_b",
        name="Tenant B Supplier",
        company_name="Tenant B Corp",
        email="contact@tenantb.com",
        phone="67890",
        gst_number="987654321098765",
        pan_number="XYZW98765A",
        contact_person="Person B"
    )
    db_session.add(sup_b)
    await db_session.commit()

    # 3. Retrieve suppliers in Tenant A's context
    tenant_context.set("tenant_a")
    res_a = await db_session.execute(select(Supplier))
    suppliers_a = res_a.scalars().all()
    
    assert len(suppliers_a) == 1
    assert suppliers_a[0].name == "Tenant A Supplier"

    # 4. Retrieve suppliers in Tenant B's context
    tenant_context.set("tenant_b")
    res_b = await db_session.execute(select(Supplier))
    suppliers_b = res_b.scalars().all()
    
    assert len(suppliers_b) == 1
    assert suppliers_b[0].name == "Tenant B Supplier"


@pytest.mark.asyncio
async def test_router_endpoints_tenant_isolation(client):
    """
    Test that endpoints scoped to a tenant correctly isolate REST requests.
    """
    # Override authentication to represent Tenant A
    app.dependency_overrides[require_org] = mock_require_org_tenant_a

    # Create supplier for Tenant A via REST
    payload = {
        "name": "Supplier REST A",
        "company_name": "REST A Corp",
        "email": "rest@tenanta.com",
        "phone": "5555",
        "gst_number": "123456789012345",
        "pan_number": "ABCDE1234F",
        "contact_person": "Rest Person A"
    }
    response = await client.post("/api/v1/suppliers/", json=payload)
    assert response.status_code == 201
    
    # List suppliers as Tenant A
    list_response = await client.get("/api/v1/suppliers/")
    assert list_response.status_code == 200
    data_a = list_response.json()
    assert len(data_a["items"]) == 2
    names_a = [item["name"] for item in data_a["items"]]
    assert "Supplier REST A" in names_a
    assert "Tenant A Supplier" in names_a

    # Override authentication to represent Tenant B
    app.dependency_overrides[require_org] = mock_require_org_tenant_b

    # List suppliers as Tenant B (should return only Tenant B's supplier)
    list_response_b = await client.get("/api/v1/suppliers/")
    assert list_response_b.status_code == 200
    data_b = list_response_b.json()
    assert len(data_b["items"]) == 1
    assert data_b["items"][0]["name"] == "Tenant B Supplier"

    # Clear dependency overrides
    app.dependency_overrides.clear()
