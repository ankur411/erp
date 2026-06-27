"""add_user_auth_fields

Revision ID: a1b2c3d4e5f6
Revises: 03ba374b4845
Create Date: 2026-06-27

Adds last_login_at and status columns to the users table.
These fields power the Platform Admin Users panel and are
updated on every authenticated login via the /auth/me endpoint.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '03ba374b4845'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add last_login_at — nullable timestamp, updated on every /auth/me call
    op.add_column(
        'users',
        sa.Column('last_login_at', sa.DateTime(), nullable=True)
    )
    # Add status — defaults to "active", allows admins to deactivate accounts
    op.add_column(
        'users',
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active')
    )


def downgrade() -> None:
    op.drop_column('users', 'status')
    op.drop_column('users', 'last_login_at')
