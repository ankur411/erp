import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.core.auth import require_auth, require_org, RequireRole, UserSession
from app.models.finance import Invoice, Payment
from app.models.purchase import PurchaseOrder
from app.modules.finance.schemas import (
    InvoiceCreate, InvoiceResponse, PaymentCreate, PaymentResponse
)

router = APIRouter(prefix="/finance", tags=["Finance & Invoices"])

# Security roles
require_viewer = Depends(RequireRole(["Viewer", "Employee"]))
require_accountant = Depends(RequireRole(["Accountant", "Organization Owner", "Super Admin"]))

async def generate_invoice_number(db: AsyncSession) -> str:
    # Format: INV-YYYYMMDD-XXXX where XXXX is incremental sequence
    today_str = datetime.now(timezone.utc).replace(tzinfo=None).strftime("%Y%m%d")
    prefix = f"INV-{today_str}-"
    
    stmt = select(func.count(Invoice.id)).where(Invoice.invoice_number.like(f"{prefix}%"))
    res = await db.execute(stmt)
    count = res.scalar_one()
    
    sequence = str(count + 1).zfill(4)
    return f"{prefix}{sequence}"

@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED, dependencies=[require_accountant])
async def create_invoice(
    invoice_in: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    # Verify purchase order exists
    po_stmt = select(PurchaseOrder).where(PurchaseOrder.id == invoice_in.purchase_order_id)
    po_res = await db.execute(po_stmt)
    po = po_res.scalars().first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase Order not found.")

    invoice_number = await generate_invoice_number(db)
    
    # Calculate total
    total_amount = float(invoice_in.subtotal) + float(invoice_in.cgst) + float(invoice_in.sgst) + float(invoice_in.igst)
    
    db_obj = Invoice(
        invoice_number=invoice_number,
        purchase_order_id=invoice_in.purchase_order_id,
        status="unpaid",
        subtotal=invoice_in.subtotal,
        cgst=invoice_in.cgst,
        sgst=invoice_in.sgst,
        igst=invoice_in.igst,
        total_amount=total_amount,
        due_date=invoice_in.due_date,
        tenant_id=current_user.tenant_id,
        created_by=current_user.user_id
    )
    
    db.add(db_obj)
    await db.commit()
    
    # Reload with relationships
    stmt = select(Invoice).where(Invoice.id == db_obj.id).options(
        selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.items),
        selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.supplier),
        selectinload(Invoice.payments)
    )
    res = await db.execute(stmt)
    loaded_inv = res.scalars().one()

    try:
        from app.modules.integrations.services import forward_webhook_to_n8n
        import asyncio
        asyncio.create_task(forward_webhook_to_n8n(
            tenant_id=loaded_inv.tenant_id,
            event_name="invoice.created",
            data={
                "id": loaded_inv.id,
                "invoice_number": loaded_inv.invoice_number,
                "total_amount": float(loaded_inv.total_amount),
                "status": loaded_inv.status
            }
        ))
    except Exception:
        pass

    return loaded_inv

@router.get("/invoices", response_model=List[InvoiceResponse], dependencies=[require_viewer])
async def list_invoices(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Invoice).options(
        selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.items),
        selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.supplier),
        selectinload(Invoice.payments)
    )
    
    if status_filter:
        stmt = stmt.where(Invoice.status == status_filter)
        
    if search:
        # Search by invoice number or PO number
        stmt = stmt.join(PurchaseOrder).where(
            or_(
                Invoice.invoice_number.ilike(f"%{search}%"),
                PurchaseOrder.po_number.ilike(f"%{search}%")
            )
        )
        
    res = await db.execute(stmt.order_by(Invoice.due_date.asc()))
    return res.scalars().all()

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse, dependencies=[require_viewer])
async def get_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Invoice).where(Invoice.id == invoice_id).options(
        selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.items),
        selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.supplier),
        selectinload(Invoice.payments)
    )
    res = await db.execute(stmt)
    invoice = res.scalars().first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")
    return invoice

@router.post("/invoices/{invoice_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED, dependencies=[require_accountant])
async def record_payment(
    invoice_id: str,
    payment_in: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    # Fetch invoice
    stmt = select(Invoice).where(Invoice.id == invoice_id).options(selectinload(Invoice.payments))
    res = await db.execute(stmt)
    invoice = res.scalars().first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")
        
    if invoice.status == "paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice is already fully paid.")

    # Record payment
    payment = Payment(
        invoice_id=invoice_id,
        amount=payment_in.amount,
        payment_method=payment_in.payment_method,
        transaction_reference=payment_in.transaction_reference,
        status="completed",
        tenant_id=current_user.tenant_id,
        created_by=current_user.user_id
    )
    db.add(payment)
    
    # Calculate new status
    existing_payment_sum = sum(p.amount for p in invoice.payments)
    total_paid = existing_payment_sum + float(payment_in.amount)
    
    if total_paid >= float(invoice.total_amount):
        invoice.status = "paid"
    elif total_paid > 0:
        invoice.status = "partially_paid"
    else:
        invoice.status = "unpaid"
        
    await db.commit()
    await db.refresh(payment)

    try:
        from app.modules.integrations.services import forward_webhook_to_n8n
        import asyncio
        asyncio.create_task(forward_webhook_to_n8n(
            tenant_id=payment.tenant_id,
            event_name="payment.completed",
            data={
                "id": payment.id,
                "invoice_id": payment.invoice_id,
                "amount": float(payment.amount),
                "payment_method": payment.payment_method,
                "transaction_reference": payment.transaction_reference,
                "status": payment.status
            }
        ))
    except Exception:
        pass

    return payment
