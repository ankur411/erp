import sentry_sdk
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.modules.suppliers.router import router as suppliers_router
from app.modules.inventory.router import router as inventory_router
from app.modules.purchase.router import router as purchase_router
from app.modules.finance.router import router as finance_router
from app.modules.system.router import router as system_router
from app.modules.imports.router import router as imports_router
from app.modules.integrations.router import router as integrations_router
import asyncio
from app.modules.integrations.services import run_scheduled_syncs
from contextlib import asynccontextmanager

async def schedule_loop():
    while True:
        try:
            await run_scheduled_syncs()
        except Exception as e:
            pass
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(schedule_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

# Initialize Sentry if DSN is set
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set up CORS middleware
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://erp-delta-hazel.vercel.app",
    "https://erp-admin-nine.vercel.app",
]

if settings.ALLOWED_ORIGINS:
    extra_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
    origins.extend(extra_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.core.tenant_middleware import TenantResolutionMiddleware
app.add_middleware(TenantResolutionMiddleware)

import traceback

# Custom Global Exception Handler for logging to Sentry
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if settings.SENTRY_DSN:
        sentry_sdk.capture_exception(exc)
        
    tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please try again later.",
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "traceback": tb_str
        }
    )

# Health Check Endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "environment": settings.ENV}

# Register Routers
app.include_router(system_router, prefix=settings.API_V1_STR)
app.include_router(suppliers_router, prefix=settings.API_V1_STR)
app.include_router(inventory_router, prefix=settings.API_V1_STR)
app.include_router(purchase_router, prefix=settings.API_V1_STR)
app.include_router(finance_router, prefix=settings.API_V1_STR)
app.include_router(imports_router, prefix=settings.API_V1_STR)
app.include_router(integrations_router, prefix=settings.API_V1_STR)
