"""add user page permissions

Revision ID: 2117042eb051
Revises: 5a63eb093e23
Create Date: 2026-06-28 11:14:01.218825

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2117042eb051'
down_revision: Union[str, Sequence[str], None] = '5a63eb093e23'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('page_permissions', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'page_permissions')
