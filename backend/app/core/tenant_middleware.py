import time
from urllib.parse import urlparse
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy import select
from app.database import SessionLocal, tenant_context
from app.models.system import Organization
from app.config import settings

# Memory cache for resolved tenants: maps hostname -> (clerk_org_id, slug, expiry_time)
TENANT_CACHE = {}
CACHE_TTL = 300 # 5 minutes

class TenantResolutionMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        # 1. Skip tenant resolution for static files / documentation / health check
        path = request.url.path
        if path.startswith("/docs") or path.startswith("/redoc") or path.startswith("/openapi.json") or path == "/health" or path == "/favicon.ico":
            return await call_next(request)

        # 2. Extract tenant identifier from Host, Origin, or custom headers
        tenant_slug = request.headers.get("X-Tenant-Slug")
        resolved_clerk_org_id = None
        resolved_slug = None
        
        if tenant_slug:
            # Try to resolve by X-Tenant-Slug header
            resolved_clerk_org_id, resolved_slug = await self.get_org_by_slug(tenant_slug)
        else:
            # Fall back to hostname resolution
            host = request.headers.get("host") or ""
            origin = request.headers.get("origin") or ""
            referer = request.headers.get("referer") or ""
            
            hostname = ""
            if origin:
                hostname = urlparse(origin).hostname or ""
            elif referer:
                hostname = urlparse(referer).hostname or ""
            elif host:
                hostname = host.split(":")[0]
                
            if hostname:
                resolved_clerk_org_id, resolved_slug = await self.resolve_hostname(hostname)

        # 3. If a tenant is resolved, bind to context and request state
        token = None
        if resolved_clerk_org_id:
            token = tenant_context.set(resolved_clerk_org_id)
            request.state.tenant_id = resolved_clerk_org_id
            request.state.tenant_slug = resolved_slug

        try:
            response: Response = await call_next(request)
        finally:
            if token:
                tenant_context.reset(token)

        # 4. Handle dynamic CORS for resolved domains
        # If the origin of the request is verified, echo it in the CORS header
        origin = request.headers.get("origin")
        if origin and resolved_clerk_org_id:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Tenant-Slug, X-API-Key"

        return response

    async def get_org_by_slug(self, slug: str):
        cache_key = f"slug:{slug}"
        now = time.time()
        if cache_key in TENANT_CACHE:
            clerk_id, slg, expiry = TENANT_CACHE[cache_key]
            if now < expiry:
                return clerk_id, slg

        async with SessionLocal() as db:
            stmt = select(Organization).where(Organization.slug == slug).execution_options(skip_tenant_filter=True)
            res = await db.execute(stmt)
            org = res.scalars().first()
            if org:
                TENANT_CACHE[cache_key] = (org.clerk_org_id, org.slug, now + CACHE_TTL)
                return org.clerk_org_id, org.slug

        return None, None

    async def resolve_hostname(self, hostname: str):
        hostname = hostname.lower()
        root_domain = settings.ROOT_DOMAIN.lower()
        
        # Skip root domains
        if hostname in ("localhost", "127.0.0.1", root_domain, f"www.{root_domain}"):
            return None, None

        cache_key = f"host:{hostname}"
        now = time.time()
        if cache_key in TENANT_CACHE:
            clerk_id, slg, expiry = TENANT_CACHE[cache_key]
            if now < expiry:
                return clerk_id, slg

        # Check subdomains
        if hostname.endswith(f".{root_domain}"):
            slug = hostname[:-len(f".{root_domain}") - 1]
            if slug and slug != "www":
                clerk_id, slg = await self.get_org_by_slug(slug)
                if clerk_id:
                    TENANT_CACHE[cache_key] = (clerk_id, slg, now + CACHE_TTL)
                    return clerk_id, slg

        # Check custom domains
        async with SessionLocal() as db:
            stmt = select(Organization).where(Organization.custom_domain == hostname).execution_options(skip_tenant_filter=True)
            res = await db.execute(stmt)
            org = res.scalars().first()
            if org:
                TENANT_CACHE[cache_key] = (org.clerk_org_id, org.slug, now + CACHE_TTL)
                return org.clerk_org_id, org.slug

        return None, None
