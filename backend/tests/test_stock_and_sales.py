"""End-to-end API scenarios on the production schema: stock intake, transfer, sale, store links, listings."""
import pytest
from fastapi import HTTPException

from backend.database import init_db, get_db_pool
from backend.routers import admin, branches, devices, products, sales, stores, suppliers
from backend.tests.conftest import branch_admin, super_admin


async def _context():
    await init_db()
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        return {
            "pool": pool,
            "admin_id": await conn.fetchval("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id LIMIT 1"),
            "owner": await conn.fetchrow("SELECT id, phone_number FROM users WHERE role = 'USER' ORDER BY id LIMIT 1"),
            "merchant_id": await conn.fetchval("SELECT id FROM merchants ORDER BY id LIMIT 1"),
            "kampot": await conn.fetchval("SELECT branch_id FROM branches WHERE branch_code = 'KP-01'"),
            "phnom_penh": await conn.fetchval("SELECT branch_id FROM branches WHERE branch_code = 'PP-01'"),
            "product_id": await conn.fetchval("SELECT id FROM products ORDER BY is_order NULLS LAST, id LIMIT 1"),
        }


async def _in_stock_branch(pool, serial):
    async with pool.acquire() as conn:
        return await conn.fetchval("SELECT branch_id FROM v_branch_product_stock WHERE serial_number = $1", serial)


def test_existing_production_rows_are_backfilled(production_db, warnings_log):
    async def scenario():
        await init_db()
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            return {r["device_id"]: dict(r) for r in await conn.fetch("""
                SELECT d.device_id, d.status::text AS status, pr.device_model, s.name AS supplier
                FROM devices d
                LEFT JOIN products pr ON pr.id = d.product_id
                LEFT JOIN suppliers s ON s.id = pr.supplier_id
                WHERE d.device_id LIKE 'PRD-%'
            """)}

    rows = production_db.run(scenario)
    assert not warnings_log.messages, warnings_log.messages
    assert rows["PRD-001"]["status"] == "ACTIVE"      # linked to a store
    assert rows["PRD-002"]["status"] == "IN_STOCK"    # latest movement IN
    assert rows["PRD-003"]["status"] == "PENDING"     # sold, no store yet
    assert rows["PRD-003"]["device_model"] == "Q3"    # type taken from the product it was stocked as


def test_stock_lifecycle(production_db, warnings_log):
    async def scenario():
        ctx = await _context()
        admin_user = super_admin(ctx["admin_id"])
        sn_a, sn_b, sn_c = "T-A", "T-B", "T-C"

        # Intake into Kampot
        await products.intake_stock(products.StockIntakeSchema(
            serial_numbers=[sn_a, sn_b, sn_a], product_id=ctx["product_id"], branch_id=ctx["kampot"]), current_user=admin_user)
        assert await _in_stock_branch(ctx["pool"], sn_a) == ctx["kampot"]

        detail = await products.get_branch_stock(search=None, branch_id=ctx["kampot"], product_id=ctx["product_id"], current_user=admin_user)
        units = {u["serial_number"]: u for u in detail["data"]}
        assert set(units) >= {sn_a, sn_b}
        assert units[sn_a]["device_row_id"] is not None

        # Duplicate intake is refused
        with pytest.raises(HTTPException):
            await products.intake_stock(products.StockIntakeSchema(serial_numbers=[sn_a], product_id=ctx["product_id"]), current_user=admin_user)

        # Transfer keeps the unit in stock at the destination
        await products.transfer_stock(products.StockTransferSchema(
            serial_numbers=[sn_a], from_branch_id=ctx["kampot"], to_branch_id=ctx["phnom_penh"]), current_user=admin_user)
        assert await _in_stock_branch(ctx["pool"], sn_a) == ctx["phnom_penh"]

        # Lookup, edit type/supplier, rename serial
        found = await devices.lookup_device_by_sn(sn_b, current_user=admin_user)
        assert found["found"] and found["has_lcd_screen"] is not None
        async with ctx["pool"].acquire() as conn:
            dev_b = await conn.fetchval("SELECT id FROM devices WHERE device_id = $1", sn_b)
        await devices.update_device(dev_b, devices.DeviceUpdateSchema(
            supplier="Hemi", device_type="Standard Soundbox", device_model="Standard Soundbox"), current_user=admin_user)
        await devices.update_device(dev_b, devices.DeviceUpdateSchema(device_sn=sn_b + "-X"), current_user=admin_user)
        sn_b += "-X"

        # Sale removes the unit from stock
        await sales.create_device_sale(sales.SaleCreateSchema(device_sn=sn_b, price=39, final_price=35, discount_amount=4), current_user=admin_user)
        assert await _in_stock_branch(ctx["pool"], sn_b) is None

        # Device intake, bulk import, store links record a stock OUT
        await devices.intake_single_device(devices.DeviceIntakeSchema(
            device_sn=sn_c, device_type="Standard Soundbox", device_model="Q3", supplier="Hemi"), current_user=admin_user)
        await devices.bulk_import_devices(devices.DeviceBulkImportSchema(serial_numbers=["T-BULK"], device_model="Y6B"), current_user=admin_user)
        await devices.register_device(devices.DeviceRegisterSchema(
            merchant_id=ctx["merchant_id"], device_sn=sn_c, device_type="Standard Soundbox", device_model="Standard Soundbox"),
            current_user=admin_user)
        await devices.register_devices_batch(devices.DeviceBatchRegisterSchema(
            merchant_id=ctx["merchant_id"], devices=[devices.BatchDeviceItem(device_sn="T-NEW")]), current_user=admin_user)
        async with ctx["pool"].acquire() as conn:
            outs = await conn.fetchval("SELECT count(*) FROM pos_invoice_items WHERE serial_number = $1", sn_c)
            dev_c = await conn.fetchval("SELECT id FROM devices WHERE device_id = $1", sn_c)
        assert outs == 1
        await devices.send_device_command(dev_c, devices.DeviceCommandSchema(command_type="TEST_SOUND"), current_user=admin_user)

        # Listings
        sales_list = await sales.list_sales(search=None, payment_method=None, limit=50, offset=0, current_user=admin_user)
        ids = [s["id"] for s in sales_list["data"]]
        assert len(ids) == len(set(ids)) and sales_list["data"]
        await sales.get_sale_detail(ids[0], current_user=admin_user)
        await sales.get_device_sales_history(sn_b, current_user=admin_user)
        device_list = await devices.list_devices(search=None, current_user=admin_user)
        assert {d["device_sn"] for d in device_list["devices"]} >= {sn_a, sn_b, sn_c}
        await devices.list_devices(search="Y6B", current_user=admin_user)
        await suppliers.list_suppliers(active_only=False, current_user=admin_user)
        await admin.get_admin_logs(search=None, log_type="all", limit=50, page=1)
        await admin.get_admin_logs(search="PRD", log_type="all", limit=50, page=1)
        await admin.get_system_stats()
        await branches.list_branches(current_user=admin_user)
        if ctx["owner"]:
            await admin.get_user_details(ctx["owner"]["id"], current_admin=admin_user)
            owner = {"id": ctx["owner"]["id"], "role": "USER", "branch_id": None,
                     "phone_number": ctx["owner"]["phone_number"], "full_name": "Owner"}
            my_stores = await stores.get_my_stores(current_user=owner)
            assert sn_c in {d["device_sn"] for d in my_stores["devices"]}

    production_db.run(scenario)
    assert not warnings_log.messages, warnings_log.messages


def test_legacy_sales_are_copied_once(production_db, warnings_log):
    async def scenario():
        ctx = await _context()
        await init_db()  # second run must not copy again
        async with ctx["pool"].acquire() as conn:
            return await conn.fetchval("SELECT count(*) FROM pos_invoices WHERE receipt_no LIKE 'LEGACY-SALE-%'")

    copied = production_db.run(scenario)
    assert not warnings_log.messages, warnings_log.messages
    # Sample has 2 legacy sales; one already exists as an OUT row with the same time, so only one is copied
    assert copied == 1


def test_stock_summary_reorder_levels_and_cost_visibility(production_db, warnings_log):
    async def scenario():
        ctx = await _context()
        admin_user = super_admin(ctx["admin_id"])
        kampot_no_cost = branch_admin(ctx["admin_id"], ctx["kampot"], crud=("read",))
        kampot_cost = branch_admin(ctx["admin_id"], ctx["kampot"], crud=("view_cost",))
        pid = ctx["product_id"]

        await products.intake_stock(products.StockIntakeSchema(
            serial_numbers=["SC-1", "SC-2", "SC-3"], product_id=pid, branch_id=ctx["kampot"], cost_price=20), current_user=admin_user)
        await products.transfer_stock(products.StockTransferSchema(
            serial_numbers=["SC-3"], from_branch_id=ctx["kampot"], to_branch_id=ctx["phnom_penh"]), current_user=admin_user)

        async def row(user=admin_user):
            summary = await products.get_branch_stock_summary(search=None, branch_id=None, current_user=user)
            return summary, next(x for x in summary["data"] if x["product_id"] == pid)

        summary, line = await row()
        by_branch = {b["branch_code"]: b["quantity"] for b in line["branches"]}
        assert by_branch.get("KP-01", 0) >= 2 and by_branch.get("PP-01", 0) >= 1
        assert line["stock_value"] >= 60 and line["last_intake"]
        assert any(x["available_quantity"] == 0 for x in summary["data"]) or len(summary["data"]) >= 1

        qty = line["available_quantity"]
        await products.update_product(pid, products.ProductUpdateSchema(min_stock_level=qty), current_user=admin_user)
        _, line = await row()
        assert line["is_low"]
        await products.update_product(pid, products.ProductUpdateSchema(min_stock_level=qty - 1), current_user=admin_user)
        _, line = await row()
        assert not line["is_low"]
        await products.update_product(pid, products.ProductUpdateSchema(clear_min_stock_level=True), current_user=admin_user)
        summary, line = await row()
        assert line["min_stock_level"] is None and not line["is_low"]
        assert summary["low_stock_count"] == sum(1 for x in summary["data"] if x["is_low"])

        with pytest.raises(HTTPException) as empty:
            await products.update_product(pid, products.ProductUpdateSchema(), current_user=admin_user)
        assert empty.value.status_code == 400
        with pytest.raises(HTTPException) as forbidden:
            await products.update_product(pid, products.ProductUpdateSchema(purchase_price=1), current_user=kampot_no_cost)
        assert forbidden.value.status_code == 403
        # The selling price is not privileged
        await products.update_product(pid, products.ProductUpdateSchema(base_price=31), current_user=kampot_no_cost)

        summary, _ = await row(kampot_no_cost)
        assert all(b["branch_id"] == ctx["kampot"] for x in summary["data"] for b in x["branches"])
        assert summary["can_view_cost"] is False and summary["total_value"] is None
        assert all(x["base_price"] is not None and x["stock_value"] is None for x in summary["data"])
        summary, _ = await row(kampot_cost)
        assert summary["can_view_cost"] and summary["total_value"] is not None

        detail = await products.get_branch_stock(search=None, branch_id=None, product_id=pid, current_user=admin_user)
        unit = next(u for u in detail["data"] if u["serial_number"] == "SC-1")
        assert unit["days_in_stock"] == 0 and unit["device_status"] == "IN_STOCK"
        detail = await products.get_branch_stock(search=None, branch_id=None, product_id=pid, current_user=kampot_no_cost)
        assert all(u["purchase_price"] is None and u["price"] is not None for u in detail["data"])

        # A cost sent by a user without cost permission is ignored
        await products.intake_stock(products.StockIntakeSchema(
            serial_numbers=["SC-9"], product_id=pid, branch_id=ctx["kampot"], cost_price=1), current_user=kampot_no_cost)
        async with ctx["pool"].acquire() as conn:
            cost = await conn.fetchval("SELECT purchase_price FROM inventory_serials WHERE serial_number = 'SC-9'")
            product_cost = await conn.fetchval("SELECT COALESCE(purchase_price, 0) FROM products WHERE id = $1", pid)
        assert cost == product_cost

        nothing = await products.get_branch_stock_summary(search="zzz-nothing", branch_id=None, current_user=admin_user)
        assert nothing["data"] == []

    production_db.run(scenario)
    assert not warnings_log.messages, warnings_log.messages


def test_device_input_validation(production_db, warnings_log):
    async def scenario():
        ctx = await _context()
        admin_user = super_admin(ctx["admin_id"])
        async with ctx["pool"].acquire() as conn:
            dev_id = await conn.fetchval("SELECT id FROM devices WHERE device_id = 'PRD-002'")
            merchant_code = await conn.fetchval("SELECT merchant_id FROM merchants WHERE id = $1", ctx["merchant_id"])

        # Status is validated, never interpolated into SQL
        with pytest.raises(HTTPException) as bad_status:
            await devices.update_device(dev_id, devices.DeviceUpdateSchema(status="ACTIVE'; DROP TABLE devices; --"), current_user=admin_user)
        assert bad_status.value.status_code == 400

        # Unknown supplier is rejected instead of silently becoming another supplier
        with pytest.raises(HTTPException) as bad_supplier:
            await devices.update_device(dev_id, devices.DeviceUpdateSchema(supplier="No Such Supplier"), current_user=admin_user)
        assert bad_supplier.value.status_code == 400

        # A store can be referenced by its merchant code; devices store merchants.id
        await devices.update_device(dev_id, devices.DeviceUpdateSchema(merchant_id=merchant_code), current_user=admin_user)
        async with ctx["pool"].acquire() as conn:
            linked = await conn.fetchval("SELECT merchant_id FROM devices WHERE id = $1", dev_id)
            table_ok = await conn.fetchval("SELECT to_regclass('public.devices') IS NOT NULL")
        assert linked == ctx["merchant_id"] and table_ok

        with pytest.raises(HTTPException) as bad_store:
            await devices.update_device(dev_id, devices.DeviceUpdateSchema(merchant_id="MCH-DOES-NOT-EXIST"), current_user=admin_user)
        assert bad_store.value.status_code == 404

    production_db.run(scenario)
    assert not warnings_log.messages, warnings_log.messages


def test_warranty_follows_the_product(production_db, warnings_log):
    """A sale without an explicit warranty uses products.default_warranty_months (calendar months)."""
    async def scenario():
        ctx = await _context()
        admin_user = super_admin(ctx["admin_id"])
        async with ctx["pool"].acquire() as conn:
            products_by_months = {
                r["default_warranty_months"]: r["id"]
                for r in await conn.fetch("SELECT id, default_warranty_months FROM products ORDER BY id")
            }
        results = {}
        for months, product_id in products_by_months.items():
            serial = f"W-{months}"
            await products.intake_stock(products.StockIntakeSchema(
                serial_numbers=[serial], product_id=product_id, branch_id=ctx["kampot"]), current_user=admin_user)
            sale = await sales.create_device_sale(sales.SaleCreateSchema(
                device_sn=serial, price=39, final_price=39, warranty_start_date="2026-01-31T00:00:00"), current_user=admin_user)
            results[months] = sale["sale"]

        # Explicit days still win
        await products.intake_stock(products.StockIntakeSchema(
            serial_numbers=["W-CUSTOM"], product_id=ctx["product_id"], branch_id=ctx["kampot"]), current_user=admin_user)
        custom = await sales.create_device_sale(sales.SaleCreateSchema(
            device_sn="W-CUSTOM", price=39, final_price=39, warranty_days=45,
            warranty_start_date="2026-01-31T00:00:00"), current_user=admin_user)
        return results, custom["sale"]

    by_months, custom = production_db.run(scenario)
    assert not warnings_log.messages, warnings_log.messages
    # The sample catalog has a 12-month and a 3-month product; 31 Jan clamps to the end of the target month
    assert by_months[12]["warranty_end_date"].startswith("2027-01-31"), by_months[12]
    assert by_months[3]["warranty_end_date"].startswith("2026-04-30"), by_months[3]
    assert by_months[12]["warranty_days"] == 365 and by_months[3]["warranty_days"] == 89
    assert custom["warranty_days"] == 45 and custom["warranty_end_date"].startswith("2026-03-17")


def test_stock_detail_shows_status_store_and_branch(production_db, warnings_log):
    """The serial list carries what the details table shows: status, store and branch."""
    async def scenario():
        ctx = await _context()
        admin_user = super_admin(ctx["admin_id"])
        await products.intake_stock(products.StockIntakeSchema(
            serial_numbers=["D-1"], product_id=ctx["product_id"], branch_id=ctx["kampot"]), current_user=admin_user)
        detail = await products.get_branch_stock(search=None, branch_id=None, product_id=ctx["product_id"], current_user=admin_user)
        return next(u for u in detail["data"] if u["serial_number"] == "D-1")

    unit = production_db.run(scenario)
    assert not warnings_log.messages, warnings_log.messages
    assert unit["device_status"] == "IN_STOCK"
    assert unit["branch_name"] == "Kampot Branch"
    # In stock means no store yet
    assert unit["store_name"] is None and unit["merchant_id"] is None


def test_stock_exposes_current_product_cost_separately(production_db):
    async def scenario():
        ctx = await _context()
        actor = super_admin(ctx['admin_id'])
        await products.intake_stock(products.StockIntakeSchema(
            serial_numbers=['COST-WARNING'], product_id=ctx['product_id'],
            branch_id=ctx['kampot'], cost_price=39), current_user=actor)
        async with ctx['pool'].acquire() as conn:
            await conn.execute('UPDATE products SET purchase_price=7 WHERE id=$1', ctx['product_id'])
        detail = await products.get_branch_stock(search='COST-WARNING', branch_id=ctx['kampot'], product_id=ctx['product_id'], current_user=actor)
        unit = detail['data'][0]
        assert unit['purchase_price'] == 39
        assert unit['product_purchase_price'] == 7
        restricted = await products.get_branch_stock(search='COST-WARNING', branch_id=ctx['kampot'], product_id=ctx['product_id'], current_user=branch_admin(ctx['admin_id'], ctx['kampot']))
        assert restricted['data'][0]['purchase_price'] is None
        assert restricted['data'][0]['product_purchase_price'] is None
    production_db.run(scenario)
