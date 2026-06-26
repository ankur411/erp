"""add_api_keys_table

Revision ID: 9d48007ae159
Revises: 120259cbe56b
Create Date: 2026-06-26 09:17:36.448600

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d48007ae159'
down_revision: Union[str, Sequence[str], None] = '120259cbe56b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'api_keys',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=False),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('hashed_key', sa.String(length=255), nullable=False),
        sa.Column('key_prefix', sa.String(length=16), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_api_keys_tenant_id'), 'api_keys', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_api_keys_hashed_key'), 'api_keys', ['hashed_key'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_api_keys_hashed_key'), table_name='api_keys')
    op.drop_index(op.f('ix_api_keys_tenant_id'), table_name='api_keys')
    op.drop_table('api_keys')
