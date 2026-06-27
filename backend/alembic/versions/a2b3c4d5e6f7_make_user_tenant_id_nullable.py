"""make user tenant id nullable

Revision ID: a2b3c4d5e6f7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-27

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a2b3c4d5e6f7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Modify users.tenant_id to be nullable
    op.alter_column('users', 'tenant_id',
               existing_type=sa.String(length=36),
               nullable=True)


def downgrade() -> None:
    # Modify users.tenant_id to be non-nullable
    op.alter_column('users', 'tenant_id',
               existing_type=sa.String(length=36),
               nullable=False)
