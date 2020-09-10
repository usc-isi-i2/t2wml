"""get rid of WikidataProperty and WikidataItem, switch to WikidataEntry instead

Revision ID: c9e2637ff205
Revises: ec070aa0e62a
Create Date: 2020-09-07 13:30:06.075904

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c9e2637ff205'
down_revision = 'ec070aa0e62a'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('wikidata_entry',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('wd_id', sa.String(length=64), nullable=True),
    sa.Column('data_type', sa.String(length=64), nullable=True),
    sa.Column('label', sa.String(length=64), nullable=True),
    sa.Column('description', sa.String(length=200), nullable=True),
    sa.Column('P31', sa.String(length=64), nullable=True),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_wikidata_entry'))
    )
    with op.batch_alter_table('wikidata_entry', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_wikidata_entry_wd_id'), ['wd_id'], unique=False)

    with op.batch_alter_table('wikidata_item', schema=None) as batch_op:
        batch_op.drop_index('ix_wikidata_item_wd_id')

    op.drop_table('wikidata_item')
    with op.batch_alter_table('wikidata_property', schema=None) as batch_op:
        batch_op.drop_index('ix_wikidata_property_wd_id')

    op.drop_table('wikidata_property')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('wikidata_property',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('wd_id', sa.VARCHAR(length=64), nullable=True),
    sa.Column('property_type', sa.VARCHAR(length=64), nullable=True),
    sa.Column('description', sa.VARCHAR(length=200), nullable=True),
    sa.Column('label', sa.VARCHAR(length=64), nullable=True),
    sa.PrimaryKeyConstraint('id', name='pk_wikidata_property')
    )
    with op.batch_alter_table('wikidata_property', schema=None) as batch_op:
        batch_op.create_index('ix_wikidata_property_wd_id', ['wd_id'], unique=False)

    op.create_table('wikidata_item',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('wd_id', sa.VARCHAR(length=64), nullable=True),
    sa.Column('label', sa.VARCHAR(length=300), nullable=True),
    sa.Column('description', sa.VARCHAR(length=1000), nullable=True),
    sa.PrimaryKeyConstraint('id', name='pk_wikidata_item')
    )
    with op.batch_alter_table('wikidata_item', schema=None) as batch_op:
        batch_op.create_index('ix_wikidata_item_wd_id', ['wd_id'], unique=False)

    with op.batch_alter_table('wikidata_entry', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_wikidata_entry_wd_id'))

    op.drop_table('wikidata_entry')
    # ### end Alembic commands ###
