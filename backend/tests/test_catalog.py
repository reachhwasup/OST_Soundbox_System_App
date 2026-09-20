"""Manage Product / Manage Supplier: products carry their own model and supplier, and removal keeps history."""
import pytest
from fastapi import HTTPException

from backend.database import init_db, get_db_pool
from backend.routers import branches, products, sales, suppliers
from backend.tests.conftest import super_admin


async def _admin_user():
    await init_db()
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        admin_id = await conn.fetchval("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id LIMIT 1")
    return pool, super_admin(admin_id)


def test_device_types_table_is_gone_and_products_carry_the_details(production_db, warnings_log):
    async def scenario():
        pool, user = await _admin_user()
        async with pool.acquire() as conn:
            table = await conn.fetchval("SELECT to_regclass('public.device_types')")
            catalog = await conn.fetch("""
                SELECT p.sku, p.device_model, s.name AS supplier
                FROM products p LEFT JOIN suppliers s ON s.id = p.supplier_id
                ORDER BY p.is_order NULLS LAST, p.id
            """)
            devices = await conn.fetch("SELECT device_id, product_id FROM devices WHERE device_id LIKE 'PRD-%' ORDER BY device_id")
        listing = await products.list_products(False, user)
        return table, [dict(r) for r in catalog], [dict(r) for r in devices], listing["data"]

    table, catalog, devices, listing = production_db.run(scenario)
    assert not warnings_log.messages, warnings_log.messages
    assert table is None                                   # the table is dropped by the migration
    assert all(row["device_model"] for row in catalog)     # model code moved onto the product
    assert any(row["supplier"] for row in catalog)         # supplier moved onto the product
    assert all(d["product_id"] is not None for d in devices)
    assert all(item["device_type"] == item["name"] for item in listing)


def test_new_product_takes_a_model_and_supplier(production_db):
    async def scenario():
        pool, user = await _admin_user()
        supplier_list = await suppliers.list_suppliers(True, user)
        supplier_id = supplier_list["data"][0]["id"]

        created = await products.create_product(
            products.ProductCreateSchema(sku="SCR-NLED-WFO", name="Soundbox None LED Screen (Wifi only)",
                                         base_price=25.0, device_model="NLED-WFO", supplier_id=supplier_id),
            user,
        )
        # No model given: the SKU is used as the model code
        defaulted = await products.create_product(
            products.ProductCreateSchema(sku="SCR-LED-WFO", name="Soundbox LED Screen (Wifi only)"), user
        )
        async with pool.acquire() as conn:
            rows = {r["sku"]: dict(r) for r in await conn.fetch(
                "SELECT sku, device_model, supplier_id FROM products WHERE sku = ANY($1::text[])",
                ["SCR-NLED-WFO", "SCR-LED-WFO"],
            )}
        return created["data"], defaulted["data"], rows, supplier_id

    created, defaulted, rows, supplier_id = production_db.run(scenario)
    assert created["device_model"] == "NLED-WFO"
    assert rows["SCR-NLED-WFO"]["supplier_id"] == supplier_id
    assert defaulted["device_model"] == "SCR-LED-WFO"
    assert rows["SCR-LED-WFO"]["supplier_id"] is None


def test_unknown_supplier_is_refused(production_db):
    async def scenario():
        _, user = await _admin_user()
        with pytest.raises(HTTPException) as create_err:
            await products.create_product(
                products.ProductCreateSchema(sku="X-1", name="Bad supplier", supplier_id=999999), user
            )
        product_id = None
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            product_id = await conn.fetchval("SELECT id FROM products ORDER BY id LIMIT 1")
        with pytest.raises(HTTPException) as update_err:
            await products.update_product(product_id, products.ProductUpdateSchema(supplier_id=999999), user)
        return create_err.value.status_code, update_err.value.status_code

    assert production_db.run(scenario) == (400, 400)


def test_supplier_can_be_changed_and_detached(production_db):
    async def scenario():
        pool, user = await _admin_user()
        supplier_list = await suppliers.list_suppliers(True, user)
        other = supplier_list["data"][-1]["id"]
        async with pool.acquire() as conn:
            product_id = await conn.fetchval("SELECT id FROM products ORDER BY is_order NULLS LAST, id LIMIT 1")

        await products.update_product(product_id, products.ProductUpdateSchema(supplier_id=other), user)
        async with pool.acquire() as conn:
            moved = await conn.fetchval("SELECT supplier_id FROM products WHERE id = $1", product_id)

        await products.update_product(product_id, products.ProductUpdateSchema(clear_supplier=True), user)
        async with pool.acquire() as conn:
            detached = await conn.fetchval("SELECT supplier_id FROM products WHERE id = $1", product_id)
        return moved, other, detached

    moved, other, detached = production_db.run(scenario)
    assert moved == other
    assert detached is None


def test_product_with_stock_history_is_deactivated_not_deleted(production_db):
    async def scenario():
        pool, user = await _admin_user()
        async with pool.acquire() as conn:
            used = await conn.fetchval(
                "SELECT product_id FROM pos_invoice_items WHERE product_id IS NOT NULL ORDER BY id LIMIT 1"
            )
        used_result = await products.delete_product(used, user)

        fresh = await products.create_product(
            products.ProductCreateSchema(sku="TMP-1", name="Throwaway product"), user
        )
        fresh_result = await products.delete_product(fresh["data"]["id"], user)

        async with pool.acquire() as conn:
            still_there = await conn.fetchval("SELECT is_active FROM products WHERE id = $1", used)
            gone = await conn.fetchval("SELECT id FROM products WHERE id = $1", fresh["data"]["id"])
        return used_result["data"]["deactivated"], fresh_result["data"]["deactivated"], still_there, gone

    used_deactivated, fresh_deactivated, still_there, gone = production_db.run(scenario)
    assert used_deactivated is True
    assert fresh_deactivated is False
    assert still_there is False   # deactivated, row kept
    assert gone is None


def test_supplier_device_count_follows_products(production_db):
    async def scenario():
        pool, user = await _admin_user()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT p.supplier_id, COUNT(d.id)::int AS devices
                FROM products p JOIN devices d ON d.product_id = p.id
                WHERE p.supplier_id IS NOT NULL
                GROUP BY p.supplier_id ORDER BY devices DESC LIMIT 1
            """)
        listing = await suppliers.list_suppliers(False, user)
        by_id = {s["id"]: s for s in listing["data"]}
        return row, by_id

    row, by_id = production_db.run(scenario)
    if row:  # the sample production data links at least one device to a supplier's product
        assert by_id[row["supplier_id"]]["device_count"] >= row["devices"]


def test_branch_lifecycle_keeps_history(production_db):
    """A branch with no history is deleted; one that stock or devices point at is closed instead."""
    async def scenario():
        pool, user = await _admin_user()

        created = await branches.create_branch(
            branches.BranchCreateSchema(branch_code="tt-99", branch_name="Temp Branch", location="Nowhere"), user
        )
        new_id = created["data"]["branch_id"]
        await branches.update_branch(new_id, branches.BranchUpdateSchema(branch_name="Temp Branch 2"), user)
        fresh_result = await branches.delete_branch(new_id, user)

        async with pool.acquire() as conn:
            used_id = await conn.fetchval(
                "SELECT branch_id FROM inventory_serials WHERE branch_id IS NOT NULL ORDER BY id LIMIT 1"
            )
        used_result = await branches.delete_branch(used_id, user)

        listed_open = await branches.list_branches(False, user)
        listed_all = await branches.list_branches(True, user)
        async with pool.acquire() as conn:
            gone = await conn.fetchval("SELECT branch_id FROM branches WHERE branch_id = $1", new_id)
            still_there = await conn.fetchval("SELECT is_active FROM branches WHERE branch_id = $1", used_id)
        return (fresh_result["data"]["deactivated"], used_result["data"]["deactivated"], gone, still_there,
                [b["branch_id"] for b in listed_open["data"]], [b["branch_id"] for b in listed_all["data"]], used_id)

    fresh_deactivated, used_deactivated, gone, still_there, open_ids, all_ids, used_id = production_db.run(scenario)
    assert fresh_deactivated is False
    assert gone is None
    assert used_deactivated is True
    assert still_there is False          # closed, row kept
    assert used_id not in open_ids       # hidden from the default listing
    assert used_id in all_ids            # shown with include_inactive


def test_duplicate_branch_code_is_refused(production_db):
    async def scenario():
        _, user = await _admin_user()
        payload = branches.BranchCreateSchema(branch_code="DUP-1", branch_name="Duplicate Branch")
        await branches.create_branch(payload, user)
        with pytest.raises(HTTPException) as err:
            await branches.create_branch(payload, user)
        return err.value.status_code

    assert production_db.run(scenario) == 400


def test_prices_follow_the_new_meanings(production_db):
    """base_price sells, products.purchase_price costs, and a sale's unit_price is the final amount."""
    async def scenario():
        pool, user = await _admin_user()
        created = await products.create_product(
            products.ProductCreateSchema(sku="PRICE-DEMO", name="Price demo soundbox",
                                         base_price=25.00, purchase_price=7.00), user
        )
        pid = created["data"]["id"]

        async with pool.acquire() as conn:
            branch = await conn.fetchval("SELECT branch_id FROM branches ORDER BY branch_id LIMIT 1")
        await products.intake_stock(products.StockIntakeSchema(
            serial_numbers=["PRICE-UNIT-1"], product_id=pid, branch_id=branch), current_user=user)

        async with pool.acquire() as conn:
            stocked = await conn.fetchrow("""
                SELECT v.price AS movement_price, inv.purchase_price AS unit_cost
                FROM v_branch_product_stock v
                JOIN inventory_serials inv ON inv.serial_number = v.serial_number
                WHERE v.serial_number = 'PRICE-UNIT-1'
            """)
            device_id = await conn.fetchval("SELECT id FROM devices WHERE device_id = 'PRICE-UNIT-1'")

        await sales.create_device_sale(sales.SaleCreateSchema(
            device_id=device_id, device_sn="PRICE-UNIT-1", price=25.00,
            discount_type="AMOUNT", discount_amount=5.00, final_price=20.00,
            quantity=1, payment_method="CASH"), current_user=user)

        async with pool.acquire() as conn:
            sold = await conn.fetchrow("""
                SELECT final_price AS unit_price, discount_amount FROM pos_invoice_items
                WHERE serial_number = 'PRICE-UNIT-1'
            """)
        history = await sales.list_sales(search=None, payment_method=None, limit=50, offset=0, current_user=user)
        row = next(r for r in history["data"] if r["device_sn"] == "PRICE-UNIT-1")
        return stocked, sold, row

    stocked, sold, row = production_db.run(scenario)
    assert float(stocked["movement_price"]) == 25.00   # intake carries the selling price
    assert float(stocked["unit_cost"]) == 7.00         # the unit's cost came from the product
    assert float(sold["unit_price"]) == 20.00          # the sale stores what was charged
    assert float(sold["discount_amount"]) == 5.00
    assert float(row["final_price"]) == 20.00          # history reads it straight back
    assert float(row["price"]) == 25.00                # and rebuilds the price before discount
