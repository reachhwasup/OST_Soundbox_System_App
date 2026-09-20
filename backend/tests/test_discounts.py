import asyncio
from decimal import Decimal
import pytest
from fastapi import HTTPException
from backend.routers import sales, products
from backend.tests.test_stock_and_sales import _context
from backend.tests.conftest import super_admin


@pytest.mark.parametrize('kind,value,expected', [('PERCENT', '10', 4.0), ('PERCENTAGE', '100', 39.99), ('FIXED', '5', 5.0), ('AMOUNT', '100', 39.99)])
def test_catalog_discount_overrides_client_amount(kind, value, expected):
    class Connection:
        async def fetchrow(self, *args):
            return {'discount_type': kind, 'discount_value': Decimal(value)}
    payload = sales.SaleCreateSchema(discount_id=1, price=39.99, discount_amount=0.01, final_price=0.01)
    asyncio.run(sales.apply_catalog_discount(Connection(), payload))
    assert payload.discount_amount == expected
    assert payload.final_price == pytest.approx(39.99 - expected)


@pytest.mark.parametrize('row', [None, {'discount_type': 'PERCENT', 'discount_value': 101}, {'discount_type': 'FIXED', 'discount_value': -1}, {'discount_type': 'UNKNOWN', 'discount_value': 5}])
def test_unavailable_or_invalid_discounts_rejected(row):
    class Connection:
        async def fetchrow(self, *args):
            return row
    with pytest.raises(HTTPException) as error:
        asyncio.run(sales.apply_catalog_discount(Connection(), sales.SaleCreateSchema(discount_id=1)))
    assert error.value.status_code == 400


def test_sale_saves_discount_reference_and_zero_price(production_db):
    async def scenario():
        ctx = await _context()
        actor = super_admin(ctx['admin_id'])
        async with ctx['pool'].acquire() as conn:
            discount_id = await conn.fetchval("INSERT INTO discounts (code, discount_type, discount_value, is_active) VALUES ('FREE', 'PERCENT', 100, TRUE) RETURNING id")
            inactive_id = await conn.fetchval("INSERT INTO discounts (code, discount_type, discount_value, is_active) VALUES ('OLD', 'FIXED', 5, FALSE) RETURNING id")
        choices = await sales.list_sale_discounts(current_user=actor)
        assert discount_id in [r['id'] for r in choices['data']]
        assert inactive_id not in [r['id'] for r in choices['data']]
        await products.intake_stock(products.StockIntakeSchema(serial_numbers=['DISCOUNT-TEST'], product_id=ctx['product_id'], branch_id=ctx['kampot']), current_user=actor)
        await sales.create_device_sale(sales.SaleCreateSchema(device_sn='DISCOUNT-TEST', price=39.99, discount_id=discount_id, discount_amount=1, final_price=38.99), current_user=actor)
        async with ctx['pool'].acquire() as conn:
            item = await conn.fetchrow("SELECT discount_id, discount_amount, final_price FROM pos_invoice_items WHERE serial_number='DISCOUNT-TEST'")
            assert item['discount_id'] == discount_id
            assert item['discount_amount'] == Decimal('39.99')
            assert item['final_price'] == 0
            assert await conn.fetchval("SELECT price FROM devices WHERE device_id='DISCOUNT-TEST'") == 0
    production_db.run(scenario)


def test_manual_discount_types_reuse_ids_and_keep_values_per_sale(production_db):
    async def scenario():
        ctx = await _context()
        actor = super_admin(ctx['admin_id'])
        # Startup is repeatable and does not duplicate the reusable type records.
        from backend.database import init_db
        await init_db()
        async with ctx['pool'].acquire() as conn:
            rows = await conn.fetch("SELECT id, discount_type FROM discounts WHERE is_custom=TRUE")
            assert len(rows) == 2
            ids = {r['discount_type']: r['id'] for r in rows}
        cases = [
            ('CUSTOM-P15', 'PERCENT', 15, 999, ids['PERCENTAGE'], Decimal('6.00'), Decimal('15.00')),
            ('CUSTOM-P20', 'PERCENT', 20, 1, ids['PERCENTAGE'], Decimal('8.00'), Decimal('20.00')),
            ('CUSTOM-F7', 'AMOUNT', 0, 7, ids['FIXED'], Decimal('7.00'), Decimal('0.00')),
            ('CUSTOM-NONE', 'NONE', 50, 0, None, Decimal('0.00'), Decimal('0.00')),
        ]
        for serial, kind, percent, amount, expected_id, expected_amount, expected_percent in cases:
            await products.intake_stock(products.StockIntakeSchema(serial_numbers=[serial], product_id=ctx['product_id'], branch_id=ctx['kampot']), current_user=actor)
            await sales.create_device_sale(sales.SaleCreateSchema(device_sn=serial, price=40, discount_type=kind, discount_percent=percent, discount_amount=amount, final_price=1), current_user=actor)
            async with ctx['pool'].acquire() as conn:
                item = await conn.fetchrow('SELECT discount_id, discount_percent, discount_amount, final_price FROM pos_invoice_items WHERE serial_number=$1', serial)
                assert item['discount_id'] == expected_id
                assert item['discount_percent'] == expected_percent
                assert item['discount_amount'] == expected_amount
                assert item['final_price'] == Decimal('40.00') - expected_amount
        async with ctx['pool'].acquire() as conn:
            assert await conn.fetchval('SELECT count(*) FROM discounts WHERE is_custom=TRUE') == 2
            await conn.execute("UPDATE discounts SET is_active=FALSE WHERE id=$1", ids['FIXED'])
            with pytest.raises(HTTPException) as error:
                await sales.apply_catalog_discount(conn, sales.SaleCreateSchema(discount_type='AMOUNT', discount_amount=5))
            assert error.value.status_code == 400
    production_db.run(scenario)
