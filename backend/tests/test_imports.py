import pytest
import io
from sqlalchemy import select
from app.database import tenant_context, user_context
from app.core.auth import require_org, UserSession
from app.models.system import Organization
from app.models import ImportJob, ImportLog

from app.models.supplier import Supplier
from app.models.inventory import Product
from app.modules.imports.services import process_import_job_bg
from app.main import app

# Target tenant for testing
TEST_TENANT_ID = "tenant_import_test"

async def mock_require_org_import():
    tenant_context.set(TEST_TENANT_ID)
    user_context.set("usr_import_test")
    return UserSession(
        user_id="usr_import_test",
        tenant_id=TEST_TENANT_ID,
        email="importer@test.com",
        role="org:admin"
    )

@pytest.fixture(autouse=True)
async def setup_test_org(db_session):
    # Clear tables to ensure isolated tests
    from app.models import ImportJob, ImportLog
    from app.models.supplier import Supplier
    from app.models.inventory import Product
    
    await db_session.execute(Supplier.__table__.delete())
    await db_session.execute(Product.__table__.delete())
    await db_session.execute(ImportLog.__table__.delete())
    await db_session.execute(ImportJob.__table__.delete())
    await db_session.commit()

    # Register the test org
    stmt = select(Organization).where(Organization.id == TEST_TENANT_ID)
    res = await db_session.execute(stmt)
    org = res.scalars().first()
    if not org:
        org = Organization(
            id=TEST_TENANT_ID,
            name="Import Test Org",
            slug="import-test-org",
            clerk_org_id="org_import_test",
            status="active"
        )
        db_session.add(org)
        await db_session.commit()
    
    # Override auth dependency
    app.dependency_overrides[require_org] = mock_require_org_import
    tenant_context.set(TEST_TENANT_ID)
    
    yield
    
    app.dependency_overrides.pop(require_org, None)
    tenant_context.set(None)

@pytest.mark.asyncio
async def test_csv_upload_and_preview(client, db_session):
    """
    Test uploading a CSV file and receiving a preview with duplicate checking.
    """
    # Create an existing supplier to trigger duplicate detection
    tenant_context.set(TEST_TENANT_ID)
    existing_supplier = Supplier(
        tenant_id=TEST_TENANT_ID,
        name="Existing Supplier",
        company_name="Existing Corp",
        email="existing@supplier.com",
        status="active"
    )
    db_session.add(existing_supplier)
    await db_session.commit()

    csv_data = (
        "Name,Company Name,Email,Phone,GST Number\n"
        "New Supplier,New Corp,new@supplier.com,123456,123456789012345\n"
        "Existing Supplier,Existing Corp,existing@supplier.com,987654,543210987654321\n"
    )
    
    files = {"file": ("test_suppliers.csv", csv_data, "text/csv")}
    
    response = await client.post(
        "/api/v1/imports/upload?target_type=suppliers",
        files=files
    )
    assert response.status_code == 201
    data = response.json()
    assert "job_id" in data
    assert data["total_rows"] == 2
    assert len(data["preview_rows"]) == 2
    
    # Row 1 validation
    row_1 = data["preview_rows"][0]
    assert row_1["mapped_data"]["name"] == "New Supplier"
    assert row_1["is_valid"] is True
    assert row_1["is_duplicate"] is False
    
    # Row 2 validation (Duplicate)
    row_2 = data["preview_rows"][1]
    assert row_2["mapped_data"]["name"] == "Existing Supplier"
    assert row_2["is_valid"] is True
    assert row_2["is_duplicate"] is True

@pytest.mark.asyncio
async def test_confirm_and_process_duplicate_skip(client, db_session):
    """
    Test confirming an import with 'skip' duplicate strategy.
    """
    tenant_context.set(TEST_TENANT_ID)
    # Existing supplier
    existing_supplier = Supplier(
        tenant_id=TEST_TENANT_ID,
        name="Existing Supplier",
        company_name="Existing Corp",
        email="existing@supplier.com",
        status="active"
    )
    db_session.add(existing_supplier)
    await db_session.commit()

    csv_data = (
        "Name,Company Name,Email,Phone,GST Number\n"
        "New Supplier,New Corp,new@supplier.com,123456,123456789012345\n"
        "Existing Supplier,Existing Corp,existing@supplier.com,987654,543210987654321\n"
    )
    
    # Upload first
    files = {"file": ("test_suppliers.csv", csv_data, "text/csv")}
    response = await client.post("/api/v1/imports/upload?target_type=suppliers", files=files)
    job_id = response.json()["job_id"]

    # Confirm
    confirm_resp = await client.post(
        f"/api/v1/imports/{job_id}/confirm",
        json={"on_duplicate": "skip"}
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "processing"

    # Execute background task synchronously in test
    await process_import_job_bg(db_session, job_id, TEST_TENANT_ID, {"on_duplicate": "skip"})

    # Check job status
    job_status_resp = await client.get(f"/api/v1/imports/{job_id}")
    assert job_status_resp.status_code == 200
    job_data = job_status_resp.json()
    assert job_data["status"] == "completed"
    assert job_data["processed_rows"] == 1  # 1 succeeded, 1 skipped
    assert len(job_data["logs"]) == 2
    
    # Verify DB contains new supplier and original supplier was unchanged
    stmt = select(Supplier).where(Supplier.tenant_id == TEST_TENANT_ID)
    res = await db_session.execute(stmt)
    suppliers = res.scalars().all()
    assert len(suppliers) == 2
    
    emails = {s.email for s in suppliers}
    assert "new@supplier.com" in emails
    assert "existing@supplier.com" in emails

@pytest.mark.asyncio
async def test_confirm_and_process_duplicate_overwrite_and_rollback(client, db_session):
    """
    Test confirming an import with 'overwrite' duplicate strategy, then testing rollback logic.
    """
    tenant_context.set(TEST_TENANT_ID)
    # Existing supplier with old company name and rating
    existing_supplier = Supplier(
        tenant_id=TEST_TENANT_ID,
        name="Existing Supplier",
        company_name="Old Company Name",
        email="existing@supplier.com",
        rating=2.0,
        status="active"
    )
    db_session.add(existing_supplier)
    await db_session.commit()

    csv_data = (
        "Name,Company Name,Email,Phone,Rating\n"
        "Existing Supplier,New Overwritten Company,existing@supplier.com,987654,4.5\n"
        "New Temp Supplier,Temp Corp,temp@supplier.com,555555,3.0\n"
    )
    
    # Upload
    files = {"file": ("test_suppliers.csv", csv_data, "text/csv")}
    response = await client.post("/api/v1/imports/upload?target_type=suppliers", files=files)
    job_id = response.json()["job_id"]

    # Confirm with overwrite
    await client.post(f"/api/v1/imports/{job_id}/confirm", json={"on_duplicate": "overwrite"})

    # Run background processing
    await process_import_job_bg(db_session, job_id, TEST_TENANT_ID, {"on_duplicate": "overwrite"})

    # Verify overwritten fields in DB
    # Need to clear session cache to reload from DB
    db_session.expire_all()
    stmt = select(Supplier).where(Supplier.email == "existing@supplier.com")
    res = await db_session.execute(stmt)
    sup_overwrite = res.scalars().first()
    assert sup_overwrite.company_name == "New Overwritten Company"
    assert float(sup_overwrite.rating) == 4.5

    # Verify new supplier exists
    stmt_temp = select(Supplier).where(Supplier.email == "temp@supplier.com")
    res_temp = await db_session.execute(stmt_temp)
    sup_temp = res_temp.scalars().first()
    assert sup_temp is not None

    # Rollback the import job
    rollback_resp = await client.post(f"/api/v1/imports/{job_id}/rollback")
    assert rollback_resp.status_code == 200
    
    # Verify rollback effects
    db_session.expire_all()
    
    # Existing supplier should be reverted to old company name and rating
    stmt_revert = select(Supplier).where(Supplier.email == "existing@supplier.com")
    res_revert = await db_session.execute(stmt_revert)
    sup_revert = res_revert.scalars().first()
    assert sup_revert.company_name == "Old Company Name"
    assert float(sup_revert.rating) == 2.0

    # New supplier should be deleted
    stmt_deleted = select(Supplier).where(Supplier.email == "temp@supplier.com")
    res_deleted = await db_session.execute(stmt_deleted)
    sup_deleted = res_deleted.scalars().first()
    assert sup_deleted is None

@pytest.mark.asyncio
async def test_zoho_books_json_import(client, db_session):
    """
    Test Zoho Books contacts JSON mapping.
    """
    tenant_context.set(TEST_TENANT_ID)
    zoho_json = """
    {
        "contacts": [
            {
                "contact_name": "Zoho Supplier",
                "company_name": "Zoho Corp",
                "email": "zoho@supplier.com",
                "phone": "999888",
                "gst_no": "GSTZOHO12345"
            }
        ]
    }
    """
    
    files = {"file": ("zoho_contacts.json", zoho_json, "application/json")}
    response = await client.post("/api/v1/imports/upload?target_type=suppliers", files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["total_rows"] == 1
    
    row = data["preview_rows"][0]
    assert row["mapped_data"]["name"] == "Zoho Supplier"
    assert row["mapped_data"]["company_name"] == "Zoho Corp"
    assert row["mapped_data"]["email"] == "zoho@supplier.com"
    assert row["mapped_data"]["gst_number"] == "GSTZOHO12345"

@pytest.mark.asyncio
async def test_xlsx_excel_import(client, db_session):
    """
    Test Excel (.xlsx) file upload and parsing.
    """
    import openpyxl
    tenant_context.set(TEST_TENANT_ID)
    
    # Construct an in-memory workbook using openpyxl
    wb = io.BytesIO()
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    # Headers
    sheet.append(["SKU", "Name", "Cost Price", "Selling Price", "Unit"])
    sheet.append(["SKU-EXCEL-001", "Excel Product", "10.50", "20.00", "pcs"])
    workbook.save(wb)
    wb.seek(0)
    
    files = {"file": ("products.xlsx", wb.read(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = await client.post("/api/v1/imports/upload?target_type=products", files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["total_rows"] == 1
    
    row = data["preview_rows"][0]
    assert row["mapped_data"]["sku"] == "SKU-EXCEL-001"
    assert row["mapped_data"]["name"] == "Excel Product"
    assert float(row["mapped_data"]["cost_price"]) == 10.50
    assert float(row["mapped_data"]["selling_price"]) == 20.00
