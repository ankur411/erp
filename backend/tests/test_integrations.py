import pytest
from sqlalchemy import select
from app.database import tenant_context, user_context
from app.core.auth import require_org, UserSession
from app.models.system import Organization
from app.models.integration import Integration, IntegrationSyncHistory, Customer, Employee
from app.models.supplier import Supplier
from app.models.inventory import Product
from app.modules.integrations.services import encrypt_val, decrypt_val, execute_sync, rollback_sync
from app.main import app

TEST_TENANT_ID = "tenant_integration_test"

async def mock_require_org():
    tenant_context.set(TEST_TENANT_ID)
    user_context.set("usr_integration_test")
    return UserSession(
        user_id="usr_integration_test",
        tenant_id=TEST_TENANT_ID,
        email="integrations@test.com",
        role="org:admin"
    )

@pytest.fixture(autouse=True)
async def setup_test_org(db_session):
    # Clear tables to ensure isolated test runs
    await db_session.execute(Customer.__table__.delete())
    await db_session.execute(Supplier.__table__.delete())
    await db_session.execute(Product.__table__.delete())
    await db_session.execute(Employee.__table__.delete())
    await db_session.execute(IntegrationSyncHistory.__table__.delete())
    await db_session.execute(Integration.__table__.delete())
    await db_session.commit()

    # Register test organization
    stmt = select(Organization).where(Organization.id == TEST_TENANT_ID)
    res = await db_session.execute(stmt)
    org = res.scalars().first()
    if not org:
        org = Organization(
            id=TEST_TENANT_ID,
            name="Integration Test Org",
            slug="integration-test-org",
            clerk_org_id="org_integration_test",
            status="active"
        )
        db_session.add(org)
        await db_session.commit()

    # Override auth dependency
    app.dependency_overrides[require_org] = mock_require_org
    tenant_context.set(TEST_TENANT_ID)

    yield

    app.dependency_overrides.pop(require_org, None)
    tenant_context.set(None)


@pytest.mark.asyncio
async def test_connect_and_test_connection(client, db_session):
    # 1. Test connection with mock settings
    test_payload = {
        "type": "n8n",
        "config": {"base_url": "http://mock-n8n.com"},
        "secrets": {"api_key": "mock-key"}
    }
    resp = await client.post("/api/v1/integrations/test-connection", json=test_payload)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # 2. Save/Connect integration
    connect_payload = {
        "name": "My n8n Service",
        "type": "n8n",
        "connection_method": "api",
        "config": {"base_url": "http://mock-n8n.com"},
        "secrets": {"api_key": "mock-secret-key-xyz"}
    }
    connect_resp = await client.post("/api/v1/integrations/connect", json=connect_payload)
    assert connect_resp.status_code == 200
    conn_data = connect_resp.json()
    assert conn_data["name"] == "My n8n Service"
    assert conn_data["connection_method"] == "api"
    assert conn_data["status"] == "connected"

    # Verify secrets are encrypted in the database
    db_session.expire_all()
    q = select(Integration).where(Integration.id == conn_data["id"])
    res = await db_session.execute(q)
    saved = res.scalar_one()
    assert saved.encrypted_secrets["api_key"] != "mock-secret-key-xyz"
    assert decrypt_val(saved.encrypted_secrets["api_key"]) == "mock-secret-key-xyz"


@pytest.mark.asyncio
async def test_fetch_workflows(client, db_session):
    # Connect first
    integration = Integration(
        name="Mock Integrations",
        type="n8n",
        connection_method="api",
        config={"base_url": "http://mock-n8n.com"},
        encrypted_secrets={"api_key": encrypt_val("mock-key")},
        tenant_id=TEST_TENANT_ID
    )
    db_session.add(integration)
    await db_session.commit()

    resp = await client.get(f"/api/v1/integrations/{integration.id}/workflows")
    assert resp.status_code == 200
    workflows = resp.json()["workflows"]
    assert len(workflows) > 0
    assert workflows[0]["name"] == "Sync Suppliers from CRM"


@pytest.mark.asyncio
async def test_manual_import_duplicate_skip(client, db_session):
    # 1. Connect
    integration = Integration(
        name="Mock Integrations",
        type="n8n",
        connection_method="api",
        config={"base_url": "http://mock-n8n.com"},
        encrypted_secrets={"api_key": encrypt_val("mock-key")},
        tenant_id=TEST_TENANT_ID
    )
    db_session.add(integration)

    # 2. Add an existing customer
    existing_customer = Customer(
        name="Existing Customer",
        email="billing@acmebuilders.com",
        company_name="Old Company Ltd",
        phone="1111",
        tenant_id=TEST_TENANT_ID
    )
    db_session.add(existing_customer)
    await db_session.commit()

    # 3. Trigger manual import with duplicate 'skip'
    import_payload = {
        "target_type": "customers",
        "duplicate_strategy": "skip"
    }
    resp = await client.post(f"/api/v1/integrations/{integration.id}/import", json=import_payload)
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"

    # 4. Trigger synchronous execution helper to simulate background execution
    sync_run = await execute_sync(
        db=db_session,
        tenant_id=TEST_TENANT_ID,
        integration_id=integration.id,
        target_type="customers",
        duplicate_strategy="skip"
    )
    assert sync_run.status == "success"
    assert sync_run.records_created == 2 # 2 new (DMRC, TechPark)
    assert sync_run.records_updated == 0 # 1 skipped (Acme Builders)

    # Verify existing customer is unchanged
    db_session.expire_all()
    q = select(Customer).where(Customer.email == "billing@acmebuilders.com")
    c_res = await db_session.execute(q)
    cust = c_res.scalar_one()
    assert cust.name == "Existing Customer"
    assert cust.company_name == "Old Company Ltd"


@pytest.mark.asyncio
async def test_manual_import_duplicate_overwrite_and_rollback(client, db_session):
    # 1. Connect
    integration = Integration(
        name="Mock Integrations",
        type="n8n",
        connection_method="api",
        config={"base_url": "http://mock-n8n.com"},
        encrypted_secrets={"api_key": encrypt_val("mock-key")},
        tenant_id=TEST_TENANT_ID
    )
    db_session.add(integration)

    # 2. Add an existing customer
    existing_customer = Customer(
        name="Existing Customer",
        email="billing@acmebuilders.com",
        company_name="Old Company Ltd",
        phone="1111",
        tenant_id=TEST_TENANT_ID
    )
    db_session.add(existing_customer)
    await db_session.commit()

    # 3. Trigger sync with overwrite
    sync_run = await execute_sync(
        db=db_session,
        tenant_id=TEST_TENANT_ID,
        integration_id=integration.id,
        target_type="customers",
        duplicate_strategy="overwrite"
    )
    assert sync_run.status == "success"
    assert sync_run.records_created == 2 # DMRC, TechPark
    assert sync_run.records_updated == 1 # Acme Builders

    sync_id = sync_run.id

    # Verify overwritten fields
    db_session.expire_all()
    q = select(Customer).where(Customer.email == "billing@acmebuilders.com")
    c_res = await db_session.execute(q)
    cust = c_res.scalar_one()
    assert cust.name == "Acme Builders"
    assert cust.company_name == "Acme Builders Group"

    # 4. Rollback
    rollback_resp = await client.post(f"/api/v1/integrations/sync-history/{sync_id}/rollback")
    assert rollback_resp.status_code == 200
    assert rollback_resp.json()["status"] == "rolled_back"

    # Verify rollback effects
    db_session.expire_all()
    # Check updated record is reverted
    q_revert = select(Customer).where(Customer.email == "billing@acmebuilders.com")
    c_revert = await db_session.execute(q_revert)
    cust_revert = c_revert.scalar_one()
    assert cust_revert.name == "Existing Customer"
    assert cust_revert.company_name == "Old Company Ltd"

    # Check newly created records (DMRC, TechPark) are deleted
    q_all = select(Customer).where(Customer.tenant_id == TEST_TENANT_ID)
    c_all = await db_session.execute(q_all)
    all_custs = c_all.scalars().all()
    assert len(all_custs) == 1 # Only the original remains!


@pytest.mark.asyncio
async def test_incoming_webhook_receiver(client, db_session):
    # Connect webhook integration
    integration = Integration(
        name="Webhook Integration",
        type="n8n",
        connection_method="webhook",
        config={"duplicate_strategy": "overwrite"},
        tenant_id=TEST_TENANT_ID
    )
    db_session.add(integration)
    await db_session.commit()

    webhook_payload = {
        "name": "Webhook Customer",
        "company_name": "Webhook Corp",
        "email": "webhook@customer.com",
        "phone": "555-555"
    }

    # Call public webhook receiver
    resp = await client.post(
        f"/api/v1/integrations/incoming-webhook/{integration.id}/Customer_Created",
        json=webhook_payload
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "success"
    assert data["processed"] == 1

    # Verify customer in DB
    db_session.expire_all()
    q = select(Customer).where(Customer.email == "webhook@customer.com")
    c_res = await db_session.execute(q)
    cust = c_res.scalar_one_or_none()
    assert cust is not None
    assert cust.name == "Webhook Customer"
    assert cust.tenant_id == TEST_TENANT_ID
