import pytest
import asyncio
from sqlalchemy import select
from unittest.mock import AsyncMock, patch
from app.database import tenant_context, user_context
from app.core.auth import require_org, UserSession
from app.models.system import Organization
from app.models.integration import Customer, Integration
from app.models.inventory import Product, Warehouse, Inventory
from app.models.sales import SalesOrder, SalesOrderItem
from app.main import app

TEST_TENANT_ID = "tenant_sales_test"

async def mock_require_org():
    tenant_context.set(TEST_TENANT_ID)
    user_context.set("usr_sales_test")
    return UserSession(
        user_id="usr_sales_test",
        tenant_id=TEST_TENANT_ID,
        email="sales_test@test.com",
        role="Super Admin"
    )

@pytest.fixture(autouse=True)
async def setup_test_org(db_session):
    # Clear tables to ensure isolated test runs
    await db_session.execute(SalesOrderItem.__table__.delete())
    await db_session.execute(SalesOrder.__table__.delete())
    await db_session.execute(Customer.__table__.delete())
    await db_session.execute(Product.__table__.delete())
    await db_session.execute(Warehouse.__table__.delete())
    await db_session.execute(Inventory.__table__.delete())
    await db_session.execute(Integration.__table__.delete())
    await db_session.commit()

    # Register test organization
    stmt = select(Organization).where(Organization.id == TEST_TENANT_ID)
    res = await db_session.execute(stmt)
    org = res.scalars().first()
    if not org:
        org = Organization(
            id=TEST_TENANT_ID,
            name="Sales Test Org",
            slug="sales-test-org",
            clerk_org_id="org_sales_test",
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
async def test_sales_order_lifecycle_and_webhook(client, db_session):
    # 1. Create a customer
    customer = Customer(
        name="Sales Customer",
        email="customer@sales.com",
        company_name="Sales Corp",
        phone="123456",
        tenant_id=TEST_TENANT_ID
    )
    db_session.add(customer)

    # 2. Create a product
    product = Product(
        sku="PROD-101",
        name="Test Widget",
        cost_price=10.0,
        selling_price=15.0,
        tenant_id=TEST_TENANT_ID
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(customer)
    await db_session.refresh(product)

    # Create Sales Order via API, and patch forward_webhook_to_n8n
    create_payload = {
        "customer_id": customer.id,
        "items": [
            {
                "product_id": product.id,
                "quantity": 5,
                "unit_price": 15.0
            }
        ]
    }

    # Patch forward_webhook_to_n8n
    with patch("app.modules.integrations.services.forward_webhook_to_n8n", new_callable=AsyncMock) as mock_webhook:
        response = await client.post("/api/v1/sales-orders/", json=create_payload)
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "draft"
        assert data["total_amount"] == 75.0
        
        # Wait a brief moment for background tasks
        await asyncio.sleep(0.1)

        # Check if mock_webhook was called with the created webhook event
        mock_webhook.assert_called_once()
        call_args = mock_webhook.call_args
        kwargs = call_args[1]
        assert kwargs["tenant_id"] == TEST_TENANT_ID
        assert kwargs["event_name"] == "sales_order.created"
        assert kwargs["data"]["status"] == "draft"
        assert kwargs["data"]["total_amount"] == 75.0

    # 4. Now update status to approved
    order_id = data["id"]
    update_payload = {"status": "approved"}
    
    with patch("app.modules.integrations.services.forward_webhook_to_n8n", new_callable=AsyncMock) as mock_webhook:
        response = await client.patch(f"/api/v1/sales-orders/{order_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
        
        await asyncio.sleep(0.1)
        mock_webhook.assert_called_once()
        call_args = mock_webhook.call_args
        kwargs = call_args[1]
        assert kwargs["event_name"] == "sales_order.updated"
        assert kwargs["data"]["status"] == "approved"

    # 5. Now fulfill/deliver the sales order to complete it
    # First we need to create inventory and a warehouse
    warehouse = Warehouse(
        name="Main WH",
        location="Here",
        status="active",
        tenant_id=TEST_TENANT_ID
    )
    db_session.add(warehouse)
    await db_session.commit()
    await db_session.refresh(warehouse)

    inventory = Inventory(
        product_id=product.id,
        warehouse_id=warehouse.id,
        current_stock=10,
        available_stock=10,
        tenant_id=TEST_TENANT_ID
    )
    db_session.add(inventory)
    await db_session.commit()

    # Deliver order
    with patch("app.modules.integrations.services.forward_webhook_to_n8n", new_callable=AsyncMock) as mock_webhook:
        response = await client.post(f"/api/v1/sales-orders/{order_id}/deliver?warehouse_id={warehouse.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"  # Should be normalized "completed" status!

        await asyncio.sleep(0.1)
        mock_webhook.assert_called_once()
        call_args = mock_webhook.call_args
        kwargs = call_args[1]
        assert kwargs["event_name"] == "sales_order.updated"
        assert kwargs["data"]["status"] == "completed"
