"""
Stock movements: the single place that writes inventory_serials, inventory_logs and the POS sale tables.

Rules
- inventory_serials holds the current state of every serial: IN_STOCK at a branch, or SOLD
  (see v_branch_product_stock, which lists the IN_STOCK rows).
- inventory_logs records every change of state, including transfers between branches.
- A sale is a pos_invoices row with one pos_invoice_items row per serial.
- Every movement runs in one database transaction (nested calls use a savepoint).
- Functions raise StockError for business-rule violations; routers turn it into HTTP 400.
"""
from datetime import date, datetime
from typing import Iterable, List, Optional


class StockError(Exception):
    """A stock operation was refused (for example: serial already in stock)."""


def clean_serials(serials: Iterable[Optional[str]]) -> List[str]:
    """Trims serial numbers, drops blanks and duplicates, keeps the entered order."""
    return list(dict.fromkeys(s.strip() for s in serials if s and s.strip()))


async def serials_in_stock(conn, serials: List[str], branch_id: Optional[int] = None) -> dict:
    """Returns {serial: row} for serials currently in stock (optionally at one branch)."""
    rows = await conn.fetch("""
        SELECT serial_number, branch_id, product_id, price, inventory_serial_id
        FROM v_branch_product_stock
        WHERE serial_number = ANY($1::text[]) AND ($2::int IS NULL OR branch_id = $2::int)
    """, serials, branch_id)
    return {r["serial_number"]: r for r in rows}


async def _log(conn, *, inventory_serial_id: int, previous: Optional[str], new: str,
               branch_id: Optional[int], changed_by: Optional[int], note: Optional[str],
               changed_at: Optional[datetime] = None) -> None:
    """Writes one inventory_logs row: the audit trail for a serial changing state or branch."""
    await conn.execute("""
        INSERT INTO inventory_logs (inventory_serial_id, previous_status, new_status, changed_by, notes, branch_id, changed_at)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, CURRENT_TIMESTAMP))
    """, inventory_serial_id, previous, new, changed_by, note, branch_id, changed_at)


async def record_stock_in(
    conn,
    *,
    serials: List[str],
    product_id: int,
    branch_id: int,
    unit_price: float,
    cost_price: float,
    remarks: Optional[str],
    changed_by: Optional[int] = None,
    sync_devices: bool = True,
) -> int:
    """
    Puts serials into stock at a branch: inventory_serials set to IN_STOCK with the supplier cost, an
    inventory_logs row each, and (when sync_devices) a devices row per serial marked IN_STOCK.
    Refuses serials that are already in stock anywhere. Returns the number of serials stocked.
    """
    serials = clean_serials(serials)
    if not serials:
        raise StockError("At least one valid serial number is required.")

    async with conn.transaction():
        already = await serials_in_stock(conn, serials)
        if already:
            raise StockError(
                "The following serial numbers are already in warehouse stock: " + ", ".join(list(already)[:5])
            )

        rows = await conn.fetch("""
            INSERT INTO inventory_serials (product_id, serial_number, status, purchase_price, branch_id, received_date)
            SELECT $1, sn, 'IN_STOCK', $2, $3, CURRENT_TIMESTAMP FROM unnest($4::text[]) AS sn
            ON CONFLICT (serial_number) DO UPDATE
            SET product_id = EXCLUDED.product_id, status = 'IN_STOCK', purchase_price = EXCLUDED.purchase_price,
                branch_id = EXCLUDED.branch_id, received_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            RETURNING id, serial_number
        """, product_id, cost_price, branch_id, serials)

        for row in rows:
            await _log(conn, inventory_serial_id=row["id"], previous=None, new="IN_STOCK",
                       branch_id=branch_id, changed_by=changed_by, note=remarks)

        if sync_devices:
            updated = await conn.fetch("""
                UPDATE devices
                SET status = 'IN_STOCK', branch_id = $1, is_active = TRUE,
                    product_id = $2, price = $3, updated_at = CURRENT_TIMESTAMP
                WHERE device_id = ANY($4::text[])
                RETURNING device_id
            """, branch_id, product_id, unit_price, serials)
            existing = {r["device_id"] for r in updated}
            missing = [s for s in serials if s not in existing]
            if missing:
                await conn.execute("""
                    INSERT INTO devices (device_id, product_id, price, status, is_active, battery, signal, branch_id)
                    SELECT sn, $1, $2, 'IN_STOCK', TRUE, '100%', 'Good', $3 FROM unnest($4::text[]) AS sn
                """, product_id, unit_price, branch_id, missing)

    return len(serials)


async def _cashier_id(conn, changed_by: Optional[int]) -> Optional[int]:
    """pos_invoices.cashier_id is NOT NULL: use the caller, else any admin, else any user."""
    if changed_by and await conn.fetchval("SELECT 1 FROM users WHERE id = $1", changed_by):
        return changed_by
    return await conn.fetchval("""
        SELECT id FROM users ORDER BY (role = 'ADMIN') DESC, id ASC LIMIT 1
    """)


async def _unique_receipt_no(conn, base: str, serial: str) -> str:
    """pos_invoices.receipt_no is unique: two sales in the same second must not collide."""
    candidate = base
    if not await conn.fetchval("SELECT 1 FROM pos_invoices WHERE receipt_no = $1", candidate):
        return candidate
    candidate = f"{base}-{serial[:12]}"
    suffix = 2
    while await conn.fetchval("SELECT 1 FROM pos_invoices WHERE receipt_no = $1", candidate):
        candidate = f"{base}-{serial[:12]}-{suffix}"
        suffix += 1
    return candidate


async def record_stock_out(
    conn,
    *,
    serial: str,
    product_id: int,
    branch_id: int,
    unit_price: float,
    quantity: int = 1,
    discount_id: Optional[int] = None,
    discount_percent: float = 0.0,
    discount_amount: float = 0.0,
    reference_no: Optional[str] = None,
    warranty_end: Optional[date] = None,
    warranty_start: Optional[datetime] = None,
    remarks: Optional[str] = None,
    moved_at: Optional[datetime] = None,
    changed_by: Optional[int] = None,
    log_note: Optional[str] = None,
    payment_method: str = "CASH",
    customer_name: Optional[str] = None,
    customer_phone: Optional[str] = None,
) -> int:
    """
    Sells a serial: a pos_invoices row with one pos_invoice_items row, inventory_serials set to SOLD,
    and an inventory_logs entry. `unit_price` is the final price, what the customer pays.
    Returns the invoice id.
    """
    del quantity  # one serial is one unit; the invoice groups them

    async with conn.transaction():
        sold_at = moved_at or datetime.now()
        original_price = float(unit_price) + float(discount_amount or 0)
        receipt_no = await _unique_receipt_no(
            conn, reference_no or f"SALE-{sold_at.strftime('%Y%m%d%H%M%S')}", serial
        )

        invoice_id = await conn.fetchval("""
            INSERT INTO pos_invoices (
                receipt_no, subtotal, total_discount, grand_total, payment_method,
                cashier_id, sale_date, branch_id, customer_name, customer_phone
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        """, receipt_no, original_price, float(discount_amount or 0), float(unit_price),
            (payment_method or "CASH").upper(), await _cashier_id(conn, changed_by), sold_at,
            branch_id, customer_name, customer_phone)

        inventory_serial_id = await conn.fetchval("""
            INSERT INTO inventory_serials (product_id, serial_number, status, purchase_price, branch_id)
            VALUES ($1::bigint, $2, 'SOLD',
                    COALESCE((SELECT purchase_price FROM products WHERE id = $1::bigint), 0), $3)
            ON CONFLICT (serial_number) DO UPDATE
            SET status = 'SOLD', branch_id = EXCLUDED.branch_id, updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """, product_id, serial, branch_id)

        await conn.execute("""
            INSERT INTO pos_invoice_items (
                invoice_id, product_id, inventory_serial_id, serial_number, original_price,
                discount_percent, discount_amount, final_price, discount_id,
                warranty_start_date, warranty_end_date, warranty_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $12, COALESCE($9::timestamptz, $10::timestamptz), $11, 'ACTIVE')
        """, invoice_id, product_id, inventory_serial_id, serial, original_price,
            float(discount_percent or 0), float(discount_amount or 0), float(unit_price),
            warranty_start, sold_at, warranty_end, discount_id)

        await _log(conn, inventory_serial_id=inventory_serial_id, previous="IN_STOCK", new="SOLD",
                   branch_id=branch_id, changed_by=changed_by, note=log_note or remarks, changed_at=sold_at)

    return invoice_id


async def transfer_stock(conn, *, serials: List[str], from_branch_id: int, to_branch_id: int,
                         from_branch_name: str, to_branch_name: str, remarks: Optional[str] = None,
                         changed_by: Optional[int] = None) -> int:
    """Moves in-stock serials between branches: the serial keeps its state and changes branch."""
    serials = clean_serials(serials)
    if not serials:
        raise StockError("At least one serial number is required.")
    if from_branch_id == to_branch_id:
        raise StockError("Source and destination branches cannot be identical.")

    async with conn.transaction():
        available = await serials_in_stock(conn, serials, from_branch_id)
        missing = [s for s in serials if s not in available]
        if missing:
            raise StockError(
                f"The following serials are not currently in {from_branch_name} stock: " + ", ".join(missing[:5])
            )

        note = (remarks or "").strip()
        moved = f"Transfer {from_branch_name} -> {to_branch_name}" + (f": {note}" if note else "")

        await conn.execute("""
            UPDATE inventory_serials SET branch_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE serial_number = ANY($2::text[])
        """, to_branch_id, serials)
        await conn.execute("""
            UPDATE devices SET branch_id = $1, updated_at = CURRENT_TIMESTAMP WHERE device_id = ANY($2::text[])
        """, to_branch_id, serials)

        for serial in serials:
            await _log(conn, inventory_serial_id=available[serial]["inventory_serial_id"],
                       previous="IN_STOCK", new="IN_STOCK", branch_id=to_branch_id,
                       changed_by=changed_by, note=moved)

    return len(serials)


async def return_to_stock(conn, *, serial: str, branch_id: Optional[int] = None,
                          changed_by: Optional[int] = None, note: Optional[str] = None) -> None:
    """Puts a sold or unlinked serial back into stock, so the stock view sees it again."""
    async with conn.transaction():
        row = await conn.fetchrow("""
            SELECT id, status, branch_id, product_id FROM inventory_serials WHERE serial_number = $1
        """, serial)
        target_branch = branch_id or (row["branch_id"] if row else None)

        if row is None:
            product_id = await conn.fetchval("SELECT product_id FROM devices WHERE device_id = $1", serial)
            inventory_serial_id = await conn.fetchval("""
                INSERT INTO inventory_serials (product_id, serial_number, status, purchase_price, branch_id)
                VALUES ($1, $2, 'IN_STOCK', COALESCE((SELECT purchase_price FROM products WHERE id = $1), 0), $3)
                RETURNING id
            """, product_id, serial, target_branch)
            previous = None
        else:
            inventory_serial_id = row["id"]
            previous = row["status"]
            await conn.execute("""
                UPDATE inventory_serials SET status = 'IN_STOCK', branch_id = COALESCE($2, branch_id),
                                             updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            """, inventory_serial_id, target_branch)

        await _log(conn, inventory_serial_id=inventory_serial_id, previous=previous, new="IN_STOCK",
                   branch_id=target_branch, changed_by=changed_by, note=note or "Returned to warehouse stock")
