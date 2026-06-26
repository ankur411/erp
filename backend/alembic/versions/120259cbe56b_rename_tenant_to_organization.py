"""rename_tenant_to_organization

Revision ID: 120259cbe56b
Revises: 8a665bc63253
Create Date: 2026-06-26 09:15:54.931265

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '120259cbe56b'
down_revision: Union[str, Sequence[str], None] = '8a665bc63253'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Rename tenants table to organizations
    op.rename_table('tenants', 'organizations')

    # 2. Add columns to organizations
    op.add_column('organizations', sa.Column('slug', sa.String(length=255), nullable=True))
    op.add_column('organizations', sa.Column('custom_domain', sa.String(length=255), nullable=True))
    op.add_column('organizations', sa.Column('is_custom_domain', sa.Boolean(), nullable=False, server_default='0'))

    # 3. Create indices for slug and custom_domain
    op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=True)
    op.create_index(op.f('ix_organizations_custom_domain'), 'organizations', ['custom_domain'], unique=True)

    # 4. Re-create the index for clerk_org_id under organizations
    op.drop_index('ix_tenants_clerk_org_id', table_name='organizations')
    op.create_index(op.f('ix_organizations_clerk_org_id'), 'organizations', ['clerk_org_id'], unique=True)

    # 5. Populate slug for existing rows (lower case and replace spaces with hyphens)
    op.execute("UPDATE organizations SET slug = LOWER(REPLACE(name, ' ', '-'))")
    op.execute("UPDATE organizations SET slug = id WHERE slug IS NULL OR slug = ''")

    # 6. Alter slug column to be non-nullable
    op.alter_column('organizations', 'slug', nullable=False, existing_type=sa.String(length=255))


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Revert slug column to nullable, drop indexes
    op.drop_index(op.f('ix_organizations_custom_domain'), table_name='organizations')
    op.drop_index(op.f('ix_organizations_slug'), table_name='organizations')

    # 2. Re-create old clerk_org_id index on tenants
    op.drop_index(op.f('ix_organizations_clerk_org_id'), table_name='organizations')
    op.create_index('ix_tenants_clerk_org_id', 'organizations', ['clerk_org_id'], unique=True)

    # 3. Drop new columns
    op.drop_column('organizations', 'is_custom_domain')
    op.drop_column('organizations', 'custom_domain')
    op.drop_column('organizations', 'slug')

    # 4. Rename organizations table back to tenants
    op.rename_table('organizations', 'tenants')
