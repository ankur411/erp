import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db, SessionLocal, tenant_context, user_context
from app.core.auth import require_org, UserSession, RequireRole
from app.models.integration import Integration, IntegrationSyncHistory
from app.modules.integrations import schemas, services
from app.modules.integrations.framework.registry import ConnectorRegistry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["Integrations"])

@router.post("/test-connection", response_model=schemas.TestConnectionResponse)
async def test_connection(
    req: schemas.TestConnectionRequest,
    current_user: UserSession = Depends(RequireRole(["Super Admin", "Organization Owner"]))
):
    connector = ConnectorRegistry.get(req.type)
    if not connector:
        return schemas.TestConnectionResponse(
            success=False,
            error_message=f"Connector '{req.type}' is not supported."
        )
    
    success, err = await connector.test_connection(req.config, req.secrets)
    return schemas.TestConnectionResponse(success=success, error_message=err)


@router.post("/connect", response_model=schemas.IntegrationResponse)
async def connect_integration(
    req: schemas.IntegrationConnectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(RequireRole(["Super Admin", "Organization Owner"]))
):
    connector = ConnectorRegistry.get(req.type)
    if not connector:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Connector '{req.type}' is not supported."
        )

    # Encrypt secrets before storing
    encrypted_secrets = services.encrypt_secrets(req.secrets)

    # Set tenant context dynamically
    t_token = tenant_context.set(current_user.tenant_id)
    try:
        # Check if an integration configuration already exists for this type/method to update it
        q = select(Integration).where(
            Integration.type == req.type,
            Integration.connection_method == req.connection_method,
            Integration.tenant_id == current_user.tenant_id
        )
        res = await db.execute(q)
        existing = res.scalar_one_or_none()

        # Test connection first if API method
        if req.connection_method == "api":
            success, err = await connector.test_connection(req.config, req.secrets)
            if not success:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Connection test failed: {err}")

        if existing:
            existing.name = req.name
            existing.config = req.config
            existing.encrypted_secrets = encrypted_secrets
            existing.is_active = True
            existing.status = "connected"
            existing.error_message = None
            existing.last_connected_at = None
            integration = existing
        else:
            integration = Integration(
                name=req.name,
                type=req.type,
                connection_method=req.connection_method,
                config=req.config,
                encrypted_secrets=encrypted_secrets,
                tenant_id=current_user.tenant_id,
                status="connected"
            )
            db.add(integration)

        await db.commit()
        await db.refresh(integration)
        return integration
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        tenant_context.reset(t_token)


@router.get("", response_model=List[schemas.IntegrationResponse])
async def list_integrations(
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(RequireRole(["Super Admin", "Organization Owner"]))
):
    t_token = tenant_context.set(current_user.tenant_id)
    try:
        q = select(Integration).where(Integration.tenant_id == current_user.tenant_id)
        res = await db.execute(q)
        return res.scalars().all()
    finally:
        tenant_context.reset(t_token)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_integration(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(RequireRole(["Super Admin", "Organization Owner"]))
):
    t_token = tenant_context.set(current_user.tenant_id)
    try:
        q = select(Integration).where(Integration.id == id, Integration.tenant_id == current_user.tenant_id)
        res = await db.execute(q)
        integration = res.scalar_one_or_none()
        if not integration:
            raise HTTPException(status_code=404, detail="Integration config not found.")

        connector = ConnectorRegistry.get(integration.type)
        if connector:
            await connector.disconnect(db, current_user.tenant_id, integration.id)

        await db.delete(integration)
        await db.commit()
    finally:
        tenant_context.reset(t_token)


@router.get("/{id}/workflows", response_model=schemas.WorkflowListResponse)
async def fetch_workflows(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(RequireRole(["Super Admin", "Organization Owner"]))
):
    t_token = tenant_context.set(current_user.tenant_id)
    try:
        q = select(Integration).where(Integration.id == id, Integration.tenant_id == current_user.tenant_id)
        res = await db.execute(q)
        integration = res.scalar_one_or_none()
        if not integration:
            raise HTTPException(status_code=404, detail="Integration config not found.")

        connector = ConnectorRegistry.get(integration.type)
        if not connector:
            raise HTTPException(status_code=400, detail="Connector type not supported.")

        decrypted_secrets = services.decrypt_secrets(integration.encrypted_secrets or {})
        config = integration.config or {}

        metadata = await connector.fetch_metadata(db, current_user.tenant_id, integration.id, config, decrypted_secrets)
        return schemas.WorkflowListResponse(workflows=metadata.get("workflows", []))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        tenant_context.reset(t_token)


@router.post("/{id}/import", response_model=schemas.IntegrationSyncHistoryResponse)
async def trigger_manual_import(
    id: str,
    req: schemas.ManualImportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(RequireRole(["Super Admin", "Organization Owner"]))
):
    t_token = tenant_context.set(current_user.tenant_id)
    try:
        q = select(Integration).where(Integration.id == id, Integration.tenant_id == current_user.tenant_id)
        res = await db.execute(q)
        integration = res.scalar_one_or_none()
        if not integration:
            raise HTTPException(status_code=404, detail="Integration config not found.")

        # Create the sync record in pending state
        sync_run = IntegrationSyncHistory(
            integration_id=integration.id,
            target_type=req.target_type,
            status="pending",
            tenant_id=current_user.tenant_id
        )
        db.add(sync_run)
        await db.commit()
        await db.refresh(sync_run)

        # Run import job in background task
        async def bg_job():
            try:
                async with SessionLocal() as bg_db:
                    await services.execute_sync(
                        db=bg_db,
                        tenant_id=current_user.tenant_id,
                        integration_id=id,
                        target_type=req.target_type,
                        duplicate_strategy=req.duplicate_strategy,
                        workflow_id=req.workflow_id
                    )
            except Exception as e:
                logger.error(f"Background sync execution failed: {str(e)}", exc_info=True)

        background_tasks.add_task(bg_job)
        return sync_run
    finally:
        tenant_context.reset(t_token)


@router.get("/{id}/sync-history", response_model=List[schemas.IntegrationSyncHistoryResponse])
async def get_sync_history(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(RequireRole(["Super Admin", "Organization Owner"]))
):
    t_token = tenant_context.set(current_user.tenant_id)
    try:
        q = select(IntegrationSyncHistory).where(
            IntegrationSyncHistory.integration_id == id,
            IntegrationSyncHistory.tenant_id == current_user.tenant_id
        ).order_by(IntegrationSyncHistory.started_at.desc())
        res = await db.execute(q)
        return res.scalars().all()
    finally:
        tenant_context.reset(t_token)


@router.post("/sync-history/{sync_id}/rollback", response_model=schemas.IntegrationSyncHistoryResponse)
async def rollback_sync_run(
    sync_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserSession = Depends(RequireRole(["Super Admin", "Organization Owner"]))
):
    t_token = tenant_context.set(current_user.tenant_id)
    try:
        # Perform rollback
        sync_run = await services.rollback_sync(db, current_user.tenant_id, sync_id)
        return sync_run
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        tenant_context.reset(t_token)


# --- WEBHOOK ENDPOINT RECEIVER ---

@router.post("/incoming-webhook/{id}/{event_name}", status_code=status.HTTP_201_CREATED)
async def incoming_webhook_receiver(
    id: str,
    event_name: str,
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Public webhook receiver endpoint mapping external webhook requests
    to internal business records. Note: Resolves tenant context dynamically
    based on the integration's registered tenant_id.
    """
    # Load integration bypassing tenant filter (public endpoint)
    # Use execution options to skip tenant filter
    q = select(Integration).where(Integration.id == id).execution_options(skip_tenant_filter=True)
    res = await db.execute(q)
    integration = res.scalar_one_or_none()

    if not integration or not integration.is_active:
        raise HTTPException(status_code=404, detail="Active integration not found.")

    tenant_id = integration.tenant_id
    t_token = tenant_context.set(tenant_id)
    u_token = user_context.set("system-webhook")

    # Map Event to Internal target type
    event_mapping = {
        "customer created": "customers",
        "supplier created": "suppliers",
        "invoice created": "invoices",
        "payment completed": "payments",
        "purchase order created": "purchase_orders",
        "inventory updated": "products",
        "attendance synced": "attendance"
    }

    target_type = event_mapping.get(event_name.lower().replace("_", " ").replace("-", " "), "customers")
    strategy = (integration.config or {}).get("duplicate_strategy", "overwrite")

    # Create pending sync run log
    sync_run = IntegrationSyncHistory(
        integration_id=integration.id,
        target_type=target_type,
        status="pending",
        tenant_id=tenant_id
    )
    db.add(sync_run)
    await db.commit()
    await db.refresh(sync_run)

    try:
        # If payload is a single dictionary, wrap it as a list
        records = [payload] if isinstance(payload, dict) else payload
        if not isinstance(records, list):
            raise ValueError("Invalid payload format. Expected object or array.")

        created_ids = []
        updated_original_values = {}
        records_processed = 0
        records_created = 0
        records_updated = 0
        records_failed = 0

        for record in records:
            records_processed += 1
            success, op, entity_id, original_data = await services._save_entity_record(
                db, tenant_id, target_type, record, strategy
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

        await db.commit()

        # Update sync history
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

        return {"status": "success", "processed": records_processed, "sync_id": sync_run.id}

    except Exception as e:
        await db.rollback()
        sync_run.status = "failed"
        sync_run.error_message = f"Webhook processing failed: {str(e)}"
        sync_run.completed_at = datetime.utcnow()
        await db.commit()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        tenant_context.reset(t_token)
        user_context.reset(u_token)
