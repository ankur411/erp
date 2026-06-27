import base64
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from cryptography.fernet import Fernet
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import SessionLocal, tenant_context, user_context
from app.models.integration import Integration, IntegrationSyncHistory, Customer, Employee, Attendance
from app.models.supplier import Supplier
from app.models.inventory import Product
from app.models.purchase import PurchaseOrder, PurchaseOrderItem
from app.models.finance import Invoice, Payment
from app.models.system import Document
from app.modules.integrations.framework.registry import ConnectorRegistry

logger = logging.getLogger(__name__)

# --- ENCRYPTION HELPERS ---

def _get_fernet_key() -> bytes:
    # Derive a 32-byte base64 key from settings.CLERK_SECRET_KEY
    key_src = settings.CLERK_SECRET_KEY or "fallback-secret-for-development-encryption"
    hasher = hashlib.sha256(key_src.encode())
    return base64.urlsafe_b64encode(hasher.digest())

def encrypt_val(val: str) -> str:
    if not val:
        return ""
    f = Fernet(_get_fernet_key())
    return f.encrypt(val.encode()).decode()

def decrypt_val(val: str) -> str:
    if not val:
        return ""
    f = Fernet(_get_fernet_key())
    return f.decrypt(val.encode()).decode()

def encrypt_secrets(secrets: Dict[str, str]) -> Dict[str, str]:
    return {k: encrypt_val(v) for k, v in secrets.items() if v}

def decrypt_secrets(secrets: Dict[str, str]) -> Dict[str, str]:
    return {k: decrypt_val(v) for k, v in secrets.items() if v}


# --- SYNC WORKER SERVICE ---

async def execute_sync(
    db: AsyncSession,
    tenant_id: str,
    integration_id: str,
    target_type: str,
    duplicate_strategy: str = "skip",
    workflow_id: Optional[str] = None
) -> IntegrationSyncHistory:
    # Establish context vars for multi-tenant middleware/listener
    t_token = tenant_context.set(tenant_id)
    u_token = user_context.set("system-sync")

    # 1. Fetch integration
    query = select(Integration).where(Integration.id == integration_id)
    res = await db.execute(query)
    integration = res.scalar_one_or_none()

    if not integration:
        tenant_context.reset(t_token)
        user_context.reset(u_token)
        raise ValueError("Integration config not found.")

    # 2. Create pending history record
    sync_run = IntegrationSyncHistory(
        integration_id=integration.id,
        target_type=target_type,
        status="pending",
        tenant_id=tenant_id
    )
    db.add(sync_run)
    await db.commit()
    await db.refresh(sync_run)

    # 3. Retrieve decrypted secrets and settings
    decrypted_secrets = decrypt_secrets(integration.encrypted_secrets or {})
    config = integration.config or {}

    connector = ConnectorRegistry.get(integration.type)
    if not connector:
        sync_run.status = "failed"
        sync_run.error_message = f"Connector '{integration.type}' not supported."
        sync_run.completed_at = datetime.utcnow()
        await db.commit()
        tenant_context.reset(t_token)
        user_context.reset(u_token)
        return sync_run

    try:
        # Fetch raw records
        raw_records = await connector.import_data(
            db=db,
            tenant_id=tenant_id,
            integration_id=integration.id,
            target_type=target_type,
            config=config,
            secrets=decrypted_secrets,
            options={"workflow_id": workflow_id}
        )

        created_ids = []
        updated_original_values = {}
        records_processed = 0
        records_created = 0
        records_updated = 0
        records_failed = 0

        for record in raw_records:
            records_processed += 1
            try:
                # Run mapping, validation, duplicate check and save
                success, op, entity_id, original_data = await _save_entity_record(
                    db, tenant_id, target_type, record, duplicate_strategy
                )
                if success:
                    if op == "create":
                        created_ids.append(entity_id)
                        records_created += 1
                    elif op == "update":
                        updated_original_values[entity_id] = original_data
                        records_updated += 1
                else:
                    records_failed += 1
            except Exception as item_err:
                logger.error(f"Failed to sync item: {str(item_err)}")
                records_failed += 1

        # Commit transaction
        await db.commit()

        # Update sync history status
        sync_run.status = "success"
        sync_run.records_processed = records_processed
        sync_run.records_created = records_created
        sync_run.records_updated = records_updated
        sync_run.records_failed = records_failed
        sync_run.sync_details = {
            "created_ids": created_ids,
            "updated_original_values": updated_original_values
        }
        sync_run.completed_at = datetime.utcnow()
        await db.commit()

        # Update integration connected date
        integration.last_connected_at = datetime.utcnow()
        integration.status = "connected"
        integration.error_message = None
        await db.commit()

    except Exception as e:
        await db.rollback()
        sync_run.status = "failed"
        sync_run.error_message = f"Sync failed: {str(e)}"
        sync_run.completed_at = datetime.utcnow()
        await db.commit()

        integration.status = "error"
        integration.error_message = str(e)
        await db.commit()

    finally:
        tenant_context.reset(t_token)
        user_context.reset(u_token)

    return sync_run


async def _save_entity_record(
    db: AsyncSession,
    tenant_id: str,
    target_type: str,
    record: Dict[str, Any],
    strategy: str
) -> Tuple[bool, str, str, Dict[str, Any]]:
    """
    Returns (success, operation_type, entity_id, original_values_dict).
    operation_type: 'create', 'update', 'skip'.
    """
    target = target_type.lower()

    if target == "customers":
        email = record.get("email")
        if not email or not record.get("name"):
            return False, "skip", "", {}
        # Duplicate check
        q = select(Customer).where(Customer.email == email)
        res = await db.execute(q)
        existing = res.scalar_one_or_none()

        if existing:
            if strategy == "skip":
                return False, "skip", "", {}
            original = {"name": existing.name, "company_name": existing.company_name, "phone": existing.phone}
            existing.name = record.get("name")
            existing.company_name = record.get("company_name")
            existing.phone = record.get("phone")
            return True, "update", existing.id, original
        else:
            new_cust = Customer(
                name=record.get("name"),
                company_name=record.get("company_name"),
                email=email,
                phone=record.get("phone"),
                tenant_id=tenant_id
            )
            db.add(new_cust)
            await db.flush()
            return True, "create", new_cust.id, {}

    elif target == "suppliers":
        email = record.get("email")
        if not email or not record.get("name") or not record.get("company_name"):
            return False, "skip", "", {}
        q = select(Supplier).where(Supplier.email == email)
        res = await db.execute(q)
        existing = res.scalar_one_or_none()

        if existing:
            if strategy == "skip":
                return False, "skip", "", {}
            original = {
                "name": existing.name, "company_name": existing.company_name,
                "phone": existing.phone, "address": existing.address,
                "gst_number": existing.gst_number, "pan_number": existing.pan_number,
                "contact_person": existing.contact_person, "rating": float(existing.rating),
                "notes": existing.notes, "status": existing.status
            }
            existing.name = record.get("name")
            existing.company_name = record.get("company_name")
            existing.phone = record.get("phone")
            existing.address = record.get("address")
            existing.gst_number = record.get("gst_number")
            existing.pan_number = record.get("pan_number")
            existing.contact_person = record.get("contact_person")
            existing.rating = record.get("rating", 5.0)
            existing.notes = record.get("notes")
            existing.status = record.get("status", "active")
            return True, "update", existing.id, original
        else:
            new_sup = Supplier(
                name=record.get("name"),
                company_name=record.get("company_name"),
                email=email,
                phone=record.get("phone"),
                address=record.get("address"),
                gst_number=record.get("gst_number"),
                pan_number=record.get("pan_number"),
                contact_person=record.get("contact_person"),
                rating=record.get("rating", 5.0),
                notes=record.get("notes"),
                status=record.get("status", "active"),
                tenant_id=tenant_id
            )
            db.add(new_sup)
            await db.flush()
            return True, "create", new_sup.id, {}

    elif target == "products":
        sku = record.get("sku")
        if not sku or not record.get("name"):
            return False, "skip", "", {}
        q = select(Product).where(Product.sku == sku)
        res = await db.execute(q)
        existing = res.scalar_one_or_none()

        if existing:
            if strategy == "skip":
                return False, "skip", "", {}
            original = {
                "name": existing.name, "description": existing.description,
                "unit": existing.unit, "cost_price": float(existing.cost_price),
                "selling_price": float(existing.selling_price), "reorder_level": existing.reorder_level
            }
            existing.name = record.get("name")
            existing.description = record.get("description")
            existing.unit = record.get("unit", "pcs")
            existing.cost_price = record.get("cost_price", 0.0)
            existing.selling_price = record.get("selling_price", 0.0)
            existing.reorder_level = record.get("reorder_level", 10)
            return True, "update", existing.id, original
        else:
            new_prod = Product(
                sku=sku,
                name=record.get("name"),
                description=record.get("description"),
                unit=record.get("unit", "pcs"),
                cost_price=record.get("cost_price", 0.0),
                selling_price=record.get("selling_price", 0.0),
                reorder_level=record.get("reorder_level", 10),
                tenant_id=tenant_id
            )
            db.add(new_prod)
            await db.flush()
            return True, "create", new_prod.id, {}

    elif target == "employees":
        email = record.get("email")
        if not email or not record.get("name"):
            return False, "skip", "", {}
        q = select(Employee).where(Employee.email == email)
        res = await db.execute(q)
        existing = res.scalar_one_or_none()

        if existing:
            if strategy == "skip":
                return False, "skip", "", {}
            original = {
                "name": existing.name, "role": existing.role,
                "department_name": existing.department_name
            }
            existing.name = record.get("name")
            existing.role = record.get("role")
            existing.department_name = record.get("department_name")
            return True, "update", existing.id, original
        else:
            new_emp = Employee(
                name=record.get("name"),
                email=email,
                role=record.get("role"),
                department_name=record.get("department_name"),
                tenant_id=tenant_id
            )
            db.add(new_emp)
            await db.flush()
            return True, "create", new_emp.id, {}

    elif target == "attendance":
        email = record.get("employee_email")
        date_str = record.get("date")
        if not email or not date_str:
            return False, "skip", "", {}
        q = select(Attendance).where(Attendance.employee_email == email, Attendance.date == date_str)
        res = await db.execute(q)
        existing = res.scalar_one_or_none()

        if existing:
            if strategy == "skip":
                return False, "skip", "", {}
            original = {
                "check_in": existing.check_in, "check_out": existing.check_out,
                "status": existing.status
            }
            existing.check_in = record.get("check_in")
            existing.check_out = record.get("check_out")
            existing.status = record.get("status", "present")
            return True, "update", existing.id, original
        else:
            new_att = Attendance(
                employee_email=email,
                date=date_str,
                check_in=record.get("check_in"),
                check_out=record.get("check_out"),
                status=record.get("status", "present"),
                tenant_id=tenant_id
            )
            db.add(new_att)
            await db.flush()
            return True, "create", new_att.id, {}

    elif target == "purchase_orders":
        po_number = record.get("po_number")
        sup_email = record.get("supplier_email")
        if not po_number or not sup_email:
            return False, "skip", "", {}

        # Verify supplier exists in tenant context
        sq = select(Supplier).where(Supplier.email == sup_email)
        sres = await db.execute(sq)
        supplier = sres.scalar_one_or_none()
        if not supplier:
            return False, "skip", "", {}

        pq = select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.po_number == po_number)
        pres = await db.execute(pq)
        existing = pres.scalar_one_or_none()

        if existing:
            if strategy == "skip":
                return False, "skip", "", {}
            # Original state capturing
            orig_items = [{"product_id": item.product_id, "quantity": item.quantity, "unit_cost": float(item.unit_cost), "total_cost": float(item.total_cost)} for item in existing.items]
            original = {
                "supplier_id": existing.supplier_id, "status": existing.status,
                "total_amount": float(existing.total_amount), "items": orig_items
            }
            # Update fields
            existing.supplier_id = supplier.id
            existing.status = record.get("status", "draft")
            existing.total_amount = record.get("total_amount", 0.0)

            # Recreate items
            # First delete all original items
            await db.execute(delete(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == existing.id))
            # Insert new items
            for item in record.get("items", []):
                # Lookup product by SKU
                prq = select(Product).where(Product.sku == item.get("sku"))
                prres = await db.execute(prq)
                product = prres.scalar_one_or_none()
                if product:
                    new_item = PurchaseOrderItem(
                        purchase_order_id=existing.id,
                        product_id=product.id,
                        quantity=item.get("quantity", 0),
                        unit_cost=item.get("unit_cost", 0.0),
                        total_cost=item.get("quantity", 0) * item.get("unit_cost", 0.0)
                    )
                    db.add(new_item)

            return True, "update", existing.id, original
        else:
            new_po = PurchaseOrder(
                po_number=po_number,
                supplier_id=supplier.id,
                status=record.get("status", "draft"),
                total_amount=record.get("total_amount", 0.0),
                tenant_id=tenant_id
            )
            db.add(new_po)
            await db.flush()

            # Insert items
            for item in record.get("items", []):
                prq = select(Product).where(Product.sku == item.get("sku"))
                prres = await db.execute(prq)
                product = prres.scalar_one_or_none()
                if product:
                    new_item = PurchaseOrderItem(
                        purchase_order_id=new_po.id,
                        product_id=product.id,
                        quantity=item.get("quantity", 0),
                        unit_cost=item.get("unit_cost", 0.0),
                        total_cost=item.get("quantity", 0) * item.get("unit_cost", 0.0)
                    )
                    db.add(new_item)

            return True, "create", new_po.id, {}

    elif target == "invoices":
        inv_number = record.get("invoice_number")
        po_number = record.get("purchase_order_number")
        if not inv_number or not po_number:
            return False, "skip", "", {}

        # Verify PO exists
        poq = select(PurchaseOrder).where(PurchaseOrder.po_number == po_number)
        pores = await db.execute(poq)
        po = pores.scalar_one_or_none()
        if not po:
            return False, "skip", "", {}

        iq = select(Invoice).where(Invoice.invoice_number == inv_number)
        ires = await db.execute(iq)
        existing = ires.scalar_one_or_none()

        # Parse due date safely
        due_date = record.get("due_date")
        if isinstance(due_date, str):
            due_date = datetime.strptime(due_date.split("T")[0], "%Y-%m-%d").date()

        if existing:
            if strategy == "skip":
                return False, "skip", "", {}
            original = {
                "purchase_order_id": existing.purchase_order_id, "status": existing.status,
                "subtotal": float(existing.subtotal), "cgst": float(existing.cgst),
                "sgst": float(existing.sgst), "igst": float(existing.igst),
                "total_amount": float(existing.total_amount), "due_date": existing.due_date.isoformat()
            }
            existing.purchase_order_id = po.id
            existing.status = record.get("status", "unpaid")
            existing.subtotal = record.get("subtotal", 0.0)
            existing.cgst = record.get("cgst", 0.0)
            existing.sgst = record.get("sgst", 0.0)
            existing.igst = record.get("igst", 0.0)
            existing.total_amount = record.get("total_amount", 0.0)
            existing.due_date = due_date
            return True, "update", existing.id, original
        else:
            new_inv = Invoice(
                invoice_number=inv_number,
                purchase_order_id=po.id,
                status=record.get("status", "unpaid"),
                subtotal=record.get("subtotal", 0.0),
                cgst=record.get("cgst", 0.0),
                sgst=record.get("sgst", 0.0),
                igst=record.get("igst", 0.0),
                total_amount=record.get("total_amount", 0.0),
                due_date=due_date,
                tenant_id=tenant_id
            )
            db.add(new_inv)
            await db.flush()
            return True, "create", new_inv.id, {}

    elif target == "payments":
        txn_ref = record.get("transaction_reference")
        inv_number = record.get("invoice_number")
        if not txn_ref or not inv_number:
            return False, "skip", "", {}

        # Verify Invoice exists
        invq = select(Invoice).where(Invoice.invoice_number == inv_number)
        invres = await db.execute(invq)
        invoice = invres.scalar_one_or_none()
        if not invoice:
            return False, "skip", "", {}

        pq = select(Payment).where(Payment.transaction_reference == txn_ref)
        pres = await db.execute(pq)
        existing = pres.scalar_one_or_none()

        paid_at = record.get("paid_at")
        if isinstance(paid_at, str):
            paid_at = datetime.fromisoformat(paid_at.replace("Z", "+00:00"))

        if existing:
            if strategy == "skip":
                return False, "skip", "", {}
            original = {
                "invoice_id": existing.invoice_id, "amount": float(existing.amount),
                "payment_method": existing.payment_method, "status": existing.status,
                "paid_at": existing.paid_at.isoformat()
            }
            existing.invoice_id = invoice.id
            existing.amount = record.get("amount", 0.0)
            existing.payment_method = record.get("payment_method", "BANK_TRANSFER")
            existing.status = record.get("status", "completed")
            existing.paid_at = paid_at
            return True, "update", existing.id, original
        else:
            new_pay = Payment(
                invoice_id=invoice.id,
                amount=record.get("amount", 0.0),
                payment_method=record.get("payment_method", "BANK_TRANSFER"),
                status=record.get("status", "completed"),
                transaction_reference=txn_ref,
                paid_at=paid_at or datetime.utcnow(),
                tenant_id=tenant_id
            )
            db.add(new_pay)
            await db.flush()
            return True, "create", new_pay.id, {}

    elif target == "documents":
        file_key = record.get("file_key")
        if not file_key:
            return False, "skip", "", {}

        dq = select(Document).where(Document.file_key == file_key)
        dres = await db.execute(dq)
        existing = dres.scalar_one_or_none()

        if existing:
            if strategy == "skip":
                return False, "skip", "", {}
            original = {
                "name": existing.name, "file_type": existing.file_type,
                "file_size": existing.file_size, "reference_type": existing.reference_type,
                "reference_id": existing.reference_id
            }
            existing.name = record.get("name", "Document")
            existing.file_type = record.get("file_type")
            existing.file_size = record.get("file_size", 0)
            existing.reference_type = record.get("reference_type")
            existing.reference_id = record.get("reference_id")
            return True, "update", existing.id, original
        else:
            new_doc = Document(
                name=record.get("name", "Document"),
                file_key=file_key,
                file_type=record.get("file_type", "application/pdf"),
                file_size=record.get("file_size", 0),
                reference_type=record.get("reference_type"),
                reference_id=record.get("reference_id"),
                tenant_id=tenant_id
            )
            db.add(new_doc)
            await db.flush()
            return True, "create", new_doc.id, {}

    return False, "skip", "", {}


# --- ROLLBACK SERVICE ---

async def rollback_sync(db: AsyncSession, tenant_id: str, sync_id: str) -> IntegrationSyncHistory:
    t_token = tenant_context.set(tenant_id)
    u_token = user_context.set("system-rollback")

    query = select(IntegrationSyncHistory).where(
        IntegrationSyncHistory.id == sync_id, 
        IntegrationSyncHistory.tenant_id == tenant_id
    )
    res = await db.execute(query)
    sync_run = res.scalar_one_or_none()

    if not sync_run:
        tenant_context.reset(t_token)
        user_context.reset(u_token)
        raise ValueError("Sync history record not found.")

    if sync_run.status != "success":
        tenant_context.reset(t_token)
        user_context.reset(u_token)
        raise ValueError(f"Cannot roll back sync run with status '{sync_run.status}'.")

    details = sync_run.sync_details or {}
    created_ids = details.get("created_ids", [])
    updated_original_values = details.get("updated_original_values", {})
    target = sync_run.target_type.lower()

    try:
        # 1. Revert Created Items (Delete them)
        if created_ids:
            if target == "customers":
                await db.execute(delete(Customer).where(Customer.id.in_(created_ids)))
            elif target == "suppliers":
                await db.execute(delete(Supplier).where(Supplier.id.in_(created_ids)))
            elif target == "products":
                await db.execute(delete(Product).where(Product.id.in_(created_ids)))
            elif target == "employees":
                await db.execute(delete(Employee).where(Employee.id.in_(created_ids)))
            elif target == "attendance":
                await db.execute(delete(Attendance).where(Attendance.id.in_(created_ids)))
            elif target == "purchase_orders":
                # Will cascade delete items automatically due to model cascade
                await db.execute(delete(PurchaseOrder).where(PurchaseOrder.id.in_(created_ids)))
            elif target == "invoices":
                await db.execute(delete(Invoice).where(Invoice.id.in_(created_ids)))
            elif target == "payments":
                await db.execute(delete(Payment).where(Payment.id.in_(created_ids)))
            elif target == "documents":
                await db.execute(delete(Document).where(Document.id.in_(created_ids)))

        # 2. Revert Updated Items (Restore original state)
        for entity_id, original in updated_original_values.items():
            if target == "customers":
                q = select(Customer).where(Customer.id == entity_id)
                res = await db.execute(q)
                ent = res.scalar_one_or_none()
                if ent:
                    ent.name = original.get("name")
                    ent.company_name = original.get("company_name")
                    ent.phone = original.get("phone")

            elif target == "suppliers":
                q = select(Supplier).where(Supplier.id == entity_id)
                res = await db.execute(q)
                ent = res.scalar_one_or_none()
                if ent:
                    ent.name = original.get("name")
                    ent.company_name = original.get("company_name")
                    ent.phone = original.get("phone")
                    ent.address = original.get("address")
                    ent.gst_number = original.get("gst_number")
                    ent.pan_number = original.get("pan_number")
                    ent.contact_person = original.get("contact_person")
                    ent.rating = original.get("rating", 5.0)
                    ent.notes = original.get("notes")
                    ent.status = original.get("status", "active")

            elif target == "products":
                q = select(Product).where(Product.id == entity_id)
                res = await db.execute(q)
                ent = res.scalar_one_or_none()
                if ent:
                    ent.name = original.get("name")
                    ent.description = original.get("description")
                    ent.unit = original.get("unit")
                    ent.cost_price = original.get("cost_price")
                    ent.selling_price = original.get("selling_price")
                    ent.reorder_level = original.get("reorder_level")

            elif target == "employees":
                q = select(Employee).where(Employee.id == entity_id)
                res = await db.execute(q)
                ent = res.scalar_one_or_none()
                if ent:
                    ent.name = original.get("name")
                    ent.role = original.get("role")
                    ent.department_name = original.get("department_name")

            elif target == "attendance":
                q = select(Attendance).where(Attendance.id == entity_id)
                res = await db.execute(q)
                ent = res.scalar_one_or_none()
                if ent:
                    ent.check_in = original.get("check_in")
                    ent.check_out = original.get("check_out")
                    ent.status = original.get("status")

            elif target == "purchase_orders":
                q = select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == entity_id)
                res = await db.execute(q)
                ent = res.scalar_one_or_none()
                if ent:
                    ent.supplier_id = original.get("supplier_id")
                    ent.status = original.get("status")
                    ent.total_amount = original.get("total_amount")

                    # Restore original items
                    await db.execute(delete(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == ent.id))
                    for item in original.get("items", []):
                        db.add(PurchaseOrderItem(
                            purchase_order_id=ent.id,
                            product_id=item.get("product_id"),
                            quantity=item.get("quantity"),
                            unit_cost=item.get("unit_cost"),
                            total_cost=item.get("total_cost")
                        ))

            elif target == "invoices":
                q = select(Invoice).where(Invoice.id == entity_id)
                res = await db.execute(q)
                ent = res.scalar_one_or_none()
                if ent:
                    ent.purchase_order_id = original.get("purchase_order_id")
                    ent.status = original.get("status")
                    ent.subtotal = original.get("subtotal")
                    ent.cgst = original.get("cgst")
                    ent.sgst = original.get("sgst")
                    ent.igst = original.get("igst")
                    ent.total_amount = original.get("total_amount")
                    ent.due_date = datetime.strptime(original.get("due_date"), "%Y-%m-%d").date()

            elif target == "payments":
                q = select(Payment).where(Payment.id == entity_id)
                res = await db.execute(q)
                ent = res.scalar_one_or_none()
                if ent:
                    ent.invoice_id = original.get("invoice_id")
                    ent.amount = original.get("amount")
                    ent.payment_method = original.get("payment_method")
                    ent.status = original.get("status")
                    ent.paid_at = datetime.fromisoformat(original.get("paid_at").replace("Z", "+00:00"))

            elif target == "documents":
                q = select(Document).where(Document.id == entity_id)
                res = await db.execute(q)
                ent = res.scalar_one_or_none()
                if ent:
                    ent.name = original.get("name")
                    ent.file_type = original.get("file_type")
                    ent.file_size = original.get("file_size")
                    ent.reference_type = original.get("reference_type")
                    ent.reference_id = original.get("reference_id")

        sync_run.status = "rolled_back"
        await db.commit()

    except Exception as e:
        await db.rollback()
        raise Exception(f"Rollback failed: {str(e)}")
    finally:
        tenant_context.reset(t_token)
        user_context.reset(u_token)

    return sync_run


# --- SCHEDULER TASK SERVICE ---

async def run_scheduled_syncs():
    """
    Run periodically (e.g. every minute) to scan for integrations
    which are configured for scheduled synchronization.
    """
    async with SessionLocal() as db:
        # Load all active integrations
        q = select(Integration).where(Integration.is_active == True)
        res = await db.execute(q)
        integrations = res.scalars().all()

        for integration in integrations:
            config = integration.config or {}
            schedule = config.get("schedule") # "hourly" or "daily"
            target_types = config.get("schedule_targets", []) # list of target types (e.g. ["customers"])

            if not schedule or not target_types:
                continue

            for target in target_types:
                # Check when was the last successful sync run for this integration and target
                sq = select(IntegrationSyncHistory).where(
                    IntegrationSyncHistory.integration_id == integration.id,
                    IntegrationSyncHistory.target_type == target,
                    IntegrationSyncHistory.status == "success"
                ).order_by(IntegrationSyncHistory.completed_at.desc()).limit(1)

                sres = await db.execute(sq)
                last_run = sres.scalar_one_or_none()

                should_sync = False
                now = datetime.utcnow()

                if not last_run:
                    should_sync = True
                else:
                    delta = now - last_run.completed_at
                    if schedule == "hourly" and delta >= timedelta(hours=1):
                        should_sync = True
                    elif schedule == "daily" and delta >= timedelta(days=1):
                        should_sync = True

                if should_sync:
                    logger.info(f"Triggering scheduled sync for integration {integration.id}, target {target}")
                    try:
                        # Spawn background execution session
                        await execute_sync(
                            db=db,
                            tenant_id=integration.tenant_id,
                            integration_id=integration.id,
                            target_type=target,
                            duplicate_strategy=config.get("duplicate_strategy", "skip"),
                            workflow_id=config.get("schedule_workflow_id")
                        )
                    except Exception as sync_err:
                        logger.error(f"Scheduled sync execution error: {str(sync_err)}")
