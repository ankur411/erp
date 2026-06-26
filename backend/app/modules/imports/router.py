from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException, BackgroundTasks, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db, tenant_context
import app.database as app_db
from app.core.auth import require_org, UserSession
from app.models import ImportJob, ImportLog
from app.models.supplier import Supplier
from app.models.inventory import Product
from app.modules.imports.schemas import (
    ImportConfirmRequest,
    ImportJobResponse,
    ImportPreviewResponse,
    ImportPreviewRow
)
from app.modules.imports.services import (
    parse_file,
    map_row,
    validate_row,
    check_duplicate,
    process_import_job_bg
)

router = APIRouter(prefix="/imports", tags=["Data Imports"])

async def run_bg_import(job_id: str, tenant_id: str, on_duplicate: str):
    """
    Wrapper for background import task that manages its own database session.
    """
    async with app_db.SessionLocal() as db:
        await process_import_job_bg(db, job_id, tenant_id, {"on_duplicate": on_duplicate})

@router.post("/upload", response_model=ImportPreviewResponse, status_code=status.HTTP_201_CREATED)
async def upload_import_file(
    target_type: str = Query(..., description="Target table: 'suppliers' or 'products'"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Uploads a file (CSV, Excel, Zoho JSON), parses it, runs schema validation and duplicate checks,
    and returns a preview of the first 50 rows.
    """
    if target_type not in ("suppliers", "products"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid target_type. Must be 'suppliers' or 'products'."
        )

    try:
        content = await file.read()
        records = parse_file(content, file.filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse import file: {str(e)}"
        )

    if not records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Import file contains no records."
        )

    # 1. Create the ImportJob record
    job = ImportJob(
        tenant_id=current_user.tenant_id,
        target_type=target_type,
        status="preview",
        file_name=file.filename,
        total_rows=len(records),
        payload=records,
        options={}
    )
    db.add(job)
    await db.flush()

    # 2. Build the preview of the first 50 rows
    preview_rows = []
    preview_limit = min(len(records), 50)
    
    for idx in range(preview_limit):
        raw_record = records[idx]
        row_num = idx + 2 # Header is row 1
        mapped = map_row(raw_record, target_type)
        is_valid, err_msg = validate_row(mapped, target_type)
        
        is_dup = False
        if is_valid:
            is_dup, _ = await check_duplicate(db, mapped, target_type)

        preview_rows.append(
            ImportPreviewRow(
                row_number=row_num,
                raw_data=raw_record,
                mapped_data=mapped,
                is_valid=is_valid,
                is_duplicate=is_dup,
                error_message=err_msg
            )
        )

    await db.commit()

    return ImportPreviewResponse(
        job_id=job.id,
        total_rows=len(records),
        preview_rows=preview_rows
    )

@router.post("/{job_id}/confirm", response_model=ImportJobResponse)
async def confirm_import_job(
    job_id: str,
    req: ImportConfirmRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Confirms an uploaded import job and queues it for background execution.
    """
    # Fetch job
    stmt = select(ImportJob).where(ImportJob.id == job_id).options(selectinload(ImportJob.logs))
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import job not found."
        )
    
    if job.status != "preview":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Import job cannot be confirmed in status: {job.status}"
        )

    # Set status to processing
    job.status = "processing"
    job.options = {"on_duplicate": req.on_duplicate}
    await db.commit()

    # Queue background task
    background_tasks.add_task(run_bg_import, job.id, current_user.tenant_id, req.on_duplicate)

    return job

@router.post("/{job_id}/rollback")
async def rollback_import_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Reverts a completed import job: deletes newly added rows, and restores overwritten records.
    """
    stmt = select(ImportJob).where(ImportJob.id == job_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import job not found."
        )

    if job.status not in ("completed", "failed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot roll back import job in status: {job.status}"
        )

    # Fetch all successful import logs for this job
    stmt_logs = select(ImportLog).where(ImportLog.import_job_id == job.id).where(ImportLog.status == "success")
    res_logs = await db.execute(stmt_logs)
    logs = res_logs.scalars().all()

    success_reversals = 0

    for log in logs:
        if not log.imported_id:
            continue

        if job.target_type == "suppliers":
            stmt_ent = select(Supplier).where(Supplier.id == log.imported_id)
            res_ent = await db.execute(stmt_ent)
            supplier = res_ent.scalars().first()
            if supplier:
                if log.original_data:
                    # Overwrite back
                    supplier.name = log.original_data.get("name")
                    supplier.company_name = log.original_data.get("company_name")
                    supplier.email = log.original_data.get("email")
                    supplier.phone = log.original_data.get("phone")
                    supplier.address = log.original_data.get("address")
                    supplier.gst_number = log.original_data.get("gst_number")
                    supplier.pan_number = log.original_data.get("pan_number")
                    supplier.contact_person = log.original_data.get("contact_person")
                    supplier.rating = float(log.original_data.get("rating") or 5.0)
                    supplier.status = log.original_data.get("status") or "active"
                    supplier.notes = log.original_data.get("notes")
                else:
                    # Delete record
                    await db.delete(supplier)
                success_reversals += 1

        elif job.target_type == "products":
            stmt_ent = select(Product).where(Product.id == log.imported_id)
            res_ent = await db.execute(stmt_ent)
            product = res_ent.scalars().first()
            if product:
                if log.original_data:
                    # Overwrite back
                    product.sku = log.original_data.get("sku")
                    product.name = log.original_data.get("name")
                    product.description = log.original_data.get("description")
                    product.category_id = log.original_data.get("category_id")
                    product.unit = log.original_data.get("unit") or "pcs"
                    product.cost_price = float(log.original_data.get("cost_price"))
                    product.selling_price = float(log.original_data.get("selling_price"))
                    product.reorder_level = int(log.original_data.get("reorder_level") or 10)
                else:
                    # Delete record
                    await db.delete(product)
                success_reversals += 1

    # Update job status
    job.status = "rolled_back"
    await db.commit()

    return {
        "status": "rolled_back",
        "message": f"Successfully rolled back import job. Reverted/deleted {success_reversals} records."
    }

@router.get("/{job_id}", response_model=ImportJobResponse)
async def get_import_job_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(require_org)
):
    """
    Retrieves status, progress, and logs of a specific import job.
    """
    stmt = (
        select(ImportJob)
        .where(ImportJob.id == job_id)
        .options(selectinload(ImportJob.logs))
    )
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import job not found."
        )

    return job
