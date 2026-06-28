"""add invitation page permissions

Revision ID: b1546fe1966b
Revises: 2117042eb051
Create Date: 2026-06-28 11:49:39.490630

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1546fe1966b'
down_revision: Union[str, Sequence[str], None] = '2117042eb051'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('organization_invitations', sa.Column('page_permissions', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('organization_invitations', 'page_permissions')
