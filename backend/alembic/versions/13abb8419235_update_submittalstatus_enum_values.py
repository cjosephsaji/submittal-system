"""Update submittalstatus enum values

Revision ID: 13abb8419235
Revises: 23327ef700dd
Create Date: 2026-02-18 13:03:16.997039

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13abb8419235'
down_revision: Union[str, Sequence[str], None] = '23327ef700dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Use autocommit as ALTER TYPE ADD VALUE cannot run inside a transaction block
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE submittalstatus ADD VALUE IF NOT EXISTS 'SUBMITTED_TO_CONTRACTOR'")
        op.execute("ALTER TYPE submittalstatus ADD VALUE IF NOT EXISTS 'FORWARDED_TO_ENGINEER'")


def downgrade() -> None:
    """Downgrade schema."""
    # Dropping enum values is not supported in PostgreSQL. 
    # To revert, one would need to recreate the type and update all referencing columns.
    pass
