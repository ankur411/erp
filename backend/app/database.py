from contextvars import ContextVar
from datetime import datetime
from typing import AsyncGenerator, Optional
from sqlalchemy import String, DateTime, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, declared_attr, Mapped, mapped_column, with_loader_criteria, Session
from app.config import settings

# Context variables for multi-tenancy
tenant_context: ContextVar[str] = ContextVar("tenant_id", default="")
user_context: ContextVar[str] = ContextVar("user_id", default="")

# Database Connection Settings
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Base class for all database models
class Base(DeclarativeBase):
    pass

# Tenant Isolation Mixin
class HasTenant:
    @declared_attr
    def tenant_id(self) -> Mapped[str]:
        # Maps to tenants(clerk_org_id) or tenant uuid
        return mapped_column(String(36), index=True, nullable=False)

    @declared_attr
    def created_by(self) -> Mapped[Optional[str]]:
        return mapped_column(String(36), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

# Event listener to automatically enforce tenant isolation on SELECT/UPDATE/DELETE queries
@event.listens_for(Session, "do_orm_execute")
def _do_orm_execute(execute_state):
    # Only filter if tenant context is active and this is not a system operation
    t_id = tenant_context.get()
    if t_id and not execute_state.execution_options.get("skip_tenant_filter", False):
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                HasTenant,
                lambda cls: cls.tenant_id == t_id,
                include_aliases=True,
                propagate_to_loaders=True
            )
        )

# Database Session Dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Import audit listener to register events
import app.core.audit

