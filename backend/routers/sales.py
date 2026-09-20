import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Union

from backend.database import get_db_pool
from backend.security import get_current_user, require_admin
from backend.device_types import resolve_product_id, resolve_product_id_for_serial
from backend.services import stock as stock_service
from backend.services.warranty import resolve_warranty

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sales", tags=["Sales & Deployments"])


class SaleCreateSchema(BaseModel):
    device_id: Optional[int] = Field(None, description="Device ID to sell")
    device_sn: Optional[str] = None
    merchant_id: Optional[Union[int, str]] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    price: float = Field(29.00, ge=0, allow_inf_nan=False)
    discount_id: Optional[int] = Field(None, gt=0)
    discount_type: str = "NONE"
    discount_percent: float = Field(0.0, ge=0, le=100, allow_inf_nan=False)
    discount_amount: float = Field(0.0, ge=0, allow_inf_nan=False)
    final_price: float = Field(29.00, ge=0, allow_inf_nan=False)
    currency: str = "USD"
    warranty_days: Optional[int] = Field(None, ge=0, description="Overrides the product's warranty; omit to use products.default_warranty_months")
    warranty_start_date: Optional[str] = None
    warranty_end_date: Optional[str] = None
    payment_method: str = "CASH"
    notes: Optional[str] = None
    quantity: int = Field(1, ge=1, description="Quantity of units sold")
    invoice_reference: Optional[str] = Field(None, description="Invoice reference or receipt number")
    target_status: str = "PENDING"  # 'PENDING' (waiting for QR registration) or 'ACTIVE'


@router.get("/discounts")
async def list_sale_discounts(current_user: Dict[str, Any] = Depends(require_admin)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, code, discount_type, discount_value, is_custom FROM discounts WHERE is_active = TRUE ORDER BY code, id")
    return {"data": [{**dict(row), "discount_value": float(row["discount_value"])} for row in rows]}


async def apply_catalog_discount(conn, payload):
    if payload.discount_id is None:
        requested = payload.discount_type.strip().upper()
        # Preserve older clients that sent a dollar discount without specifying a type.
        if requested == "NONE" and payload.discount_amount > 0:
            requested = "AMOUNT"
        if requested == "NONE":
            payload.discount_percent = 0
            payload.discount_amount = 0
            payload.final_price = payload.price
            return
        if requested not in ("PERCENT", "PERCENTAGE", "AMOUNT", "FIXED"):
            raise HTTPException(status_code=400, detail="Unknown discount type.")
        kind = "PERCENTAGE" if requested in ("PERCENT", "PERCENTAGE") else "FIXED"
        row = await conn.fetchrow("SELECT id, discount_type, discount_value, is_custom FROM discounts WHERE is_custom = TRUE AND discount_type = $1 AND is_active = TRUE ORDER BY id LIMIT 1", kind)
        if row is not None:
            payload.discount_id = row["id"]
    else:
        row = await conn.fetchrow("SELECT id, discount_type, discount_value, is_custom FROM discounts WHERE id = $1 AND is_active = TRUE", payload.discount_id)
    if row is None:
        raise HTTPException(status_code=400, detail="The selected discount is unavailable. Please choose another discount.")
    kind = str(row["discount_type"]).strip().upper()
    if row.get("is_custom"):
        value = Decimal(str(payload.discount_percent if kind in ("PERCENT", "PERCENTAGE") else payload.discount_amount))
    else:
        value = Decimal(str(row["discount_value"]))
    price = Decimal(str(payload.price))
    if not value.is_finite() or value < 0 or kind not in ("PERCENT", "PERCENTAGE", "AMOUNT", "FIXED"):
        raise HTTPException(status_code=400, detail="The selected discount has an invalid configuration.")
    percent = kind in ("PERCENT", "PERCENTAGE")
    if percent and value > 100:
        raise HTTPException(status_code=400, detail="Discount percentage cannot exceed 100.")
    amount = min(price, price * value / 100 if percent else value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    payload.discount_type = "PERCENT" if percent else "AMOUNT"
    payload.discount_percent = float(value) if percent else 0
    payload.discount_amount = float(amount)
    payload.final_price = float(max(Decimal(0), price - amount))


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_device_sale(
    payload: SaleCreateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Records a device sale and deployment transaction.
    Canonical persistence:
    1. pos_invoices + pos_invoice_items (price, discount, warranty, serial number)
    2. inventory_serials (status = 'SOLD')
    3. inventory_logs (audit record of status change)
    4. devices (merchant assignment, live hardware state, price, and status)
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await apply_catalog_discount(conn, payload)
        # 1. Resolve Device & Serial Number
        lookup_id = int(payload.device_id) if (payload.device_id and str(payload.device_id).isdigit()) else -1
        lookup_sn = str(payload.device_sn or payload.device_id or "").strip()

        # Prefer the serial number match so a numeric id can never pick an unrelated device
        device = await conn.fetchrow("""
            SELECT id, device_id AS device_sn, status, merchant_id, branch_id, product_id
            FROM devices WHERE device_id = $2 OR id = $1
            ORDER BY (device_id = $2) DESC, id DESC
            LIMIT 1
        """, lookup_id, lookup_sn)

        device_sn = lookup_sn or (device["device_sn"] if device else "")
        if not device_sn:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Device serial number is required."
            )

        sale_branch = current_user.get("branch_id") or (device.get("branch_id") if device else None) or 1

        # 2. Resolve Device Type & Product
        linked_product_id = device["product_id"] if device and device["product_id"] else await resolve_product_id(conn)
        target_product_id = await resolve_product_id_for_serial(conn, device_sn, linked_product_id) or 1

        # Auto-register device if not present
        if not device:
            new_dev = await conn.fetchrow("""
                INSERT INTO devices (
                    device_id, price, status, is_active,
                    battery, signal, branch_id, product_id
                )
                VALUES ($1, $2, 'PENDING', FALSE, '100%', 'Good', $3, $4)
                RETURNING id, device_id AS device_sn, status, merchant_id, branch_id, product_id
            """, device_sn, payload.price or 29.00, sale_branch, linked_product_id)
            device = new_dev

        # 3. Compute Dates (offset-naive for TIMESTAMP WITHOUT TIME ZONE columns)
        if payload.warranty_start_date:
            try:
                start_dt = datetime.fromisoformat(payload.warranty_start_date.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                start_dt = datetime.now()
        else:
            start_dt = datetime.now()

        end_override = None
        if payload.warranty_end_date:
            try:
                end_override = datetime.fromisoformat(payload.warranty_end_date.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                end_override = None
        # Warranty follows the product unless the request overrides it
        end_dt, warranty_days = await resolve_warranty(
            conn, product_id=target_product_id, start=start_dt,
            warranty_days=payload.warranty_days, end_override=end_override,
        )

        # 4. Resolve merchant ID
        target_merchant_id = None
        if payload.merchant_id is not None:
            try:
                target_merchant_id = int(payload.merchant_id)
            except Exception:
                target_merchant_id = None

        norm_pm = (payload.payment_method or "CASH").strip().upper()
        if norm_pm not in ("CASH", "QR_SCAN", "QR"):
            norm_pm = "CASH"

        # Reference No
        ref_no = payload.invoice_reference.strip() if (payload.invoice_reference and payload.invoice_reference.strip()) else f"SALE-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Detailed remarks
        remarks_parts = [
            f"Payment: {norm_pm}",
            f"Customer: {payload.customer_name or 'N/A'}",
            f"Phone: {payload.customer_phone or 'N/A'}"
        ]
        if payload.notes:
            remarks_parts.append(payload.notes.strip())
        remarks_str = " | ".join(remarks_parts)

        # 5-7. Stock OUT movement, inventory serial SOLD, audit log
        transaction_id = await stock_service.record_stock_out(
            conn,
            serial=device_sn,
            product_id=target_product_id,
            branch_id=sale_branch,
            # unit_price is the final price: what the customer actually pays
            unit_price=max(float(payload.price or 0.00) - float(payload.discount_amount or 0.00), 0.00),
            quantity=payload.quantity or 1,
            discount_id=payload.discount_id,
            discount_percent=payload.discount_percent or 0.00,
            discount_amount=payload.discount_amount or 0.00,
            reference_no=ref_no,
            warranty_end=end_dt.date(),
            remarks=remarks_str,
            warranty_start=start_dt,
            moved_at=start_dt,
            changed_by=current_user.get("id"),
            log_note=f"Device sold & deployed (Ref: {ref_no})",
            payment_method=norm_pm,
            customer_name=payload.customer_name,
            customer_phone=payload.customer_phone,
        )

        # 8. Update devices table
        target_status = payload.target_status if payload.target_status in ('ACTIVE', 'PENDING') else 'PENDING'
        is_active = True if target_status == 'ACTIVE' else False

        await conn.execute("""
            UPDATE devices SET
                status = $1::device_status,
                is_active = $2,
                merchant_id = COALESCE($3, merchant_id),
                price = $4,
                branch_id = COALESCE($5, branch_id),
                product_id = COALESCE($6, product_id),
                notes = COALESCE($7, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
        """,
            target_status,
            is_active,
            target_merchant_id,
            max(float(payload.price) - float(payload.discount_amount), 0.00),
            sale_branch,
            linked_product_id,
            payload.notes,
            device["id"]
        )

    return {
        "status": "success",
        "message": f"Sale for device '{device_sn}' recorded successfully in stock transactions.",
        "sale": {
            "id": transaction_id,
            "device_id": device["id"],
            "device_sn": device_sn,
            "merchant_id": target_merchant_id,
            "customer_name": payload.customer_name,
            "customer_phone": payload.customer_phone,
            "price": float(payload.price or 29.00),
            "discount_id": payload.discount_id,
            "discount_type": payload.discount_type,
            "discount_percent": float(payload.discount_percent or 0.0),
            "discount_amount": float(payload.discount_amount or 0.0),
            "final_price": float(payload.final_price or payload.price or 29.00),
            "currency": payload.currency or "USD",
            "warranty_days": warranty_days,
            "warranty_start_date": start_dt.isoformat(),
            "warranty_end_date": end_dt.isoformat(),
            "payment_method": norm_pm,
            "invoice_reference": ref_no,
            "status": "COMPLETED",
            "notes": payload.notes,
            "quantity": payload.quantity or 1,
            "created_at": start_dt.isoformat()
        }
    }


@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
async def list_sales(
    search: Optional[str] = Query(None, description="Search device SN, customer, store, or reference"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Lists device sales orders sourced from the v_sales view (pos_invoices + pos_invoice_items)
    joined with inventory_serials, devices, products, branches, and merchants.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        where_clauses = ["1=1"]
        params = []
        idx = 1

        # Branch scoping: branch admin only sees their branch's sales
        user_branch_id = current_user.get("branch_id")
        if user_branch_id is not None:
            where_clauses.append(f"st.branch_id = ${idx}")
            params.append(user_branch_id)
            idx += 1

        if search and search.strip():
            s_clean = f"%{search.strip()}%"
            where_clauses.append(f"""
                (st.serial_number ILIKE ${idx} OR
                 st.reference_no ILIKE ${idx} OR
                 st.remarks ILIKE ${idx} OR
                 COALESCE(m.merchant_name, m.name) ILIKE ${idx} OR
                 COALESCE(m.owner_phone, '') ILIKE ${idx})
            """)
            params.append(s_clean)
            idx += 1

        if payment_method and payment_method.strip().upper() != "ALL":
            pm = payment_method.strip().upper()
            where_clauses.append(f"st.remarks ILIKE ${idx}")
            params.append(f"%Payment: {pm}%")
            idx += 1

        where_sql = " AND ".join(where_clauses)

        # 1. Total Count & Total Revenue Calculation
        stats_query = f"""
            SELECT COUNT(st.transaction_id)::int AS total_count,
                   COALESCE(SUM(st.unit_price), 0.00)::numeric(12,2) AS total_revenue
            FROM v_sales st
            LEFT JOIN LATERAL (
                SELECT dev.* FROM devices dev WHERE dev.device_id = st.serial_number
                ORDER BY dev.id DESC LIMIT 1
            ) d ON true
            LEFT JOIN merchants m ON (d.merchant_id = m.id OR d.merchant_id::text = m.merchant_id::text)
            WHERE {where_sql}
        """
        stats_row = await conn.fetchrow(stats_query, *params)
        total_count = stats_row["total_count"] if stats_row else 0
        total_revenue = float(stats_row["total_revenue"]) if stats_row else 0.0

        # 2. Detailed Sales Transaction Rows
        data_query = f"""
            SELECT
                st.transaction_id AS id,
                st.serial_number AS device_sn,
                d.id AS device_id,
                d.merchant_id,
                COALESCE(m.merchant_name, m.name) AS store_name,
                COALESCE(m.owner_phone, '') AS customer_phone,
                COALESCE(m.name, m.merchant_name) AS customer_name,
                COALESCE(u.full_name, 'System Admin') AS seller_name,
                COALESCE(dp.name, p.name, 'Display Soundbox') AS device_type,
                COALESCE(dp.device_model, p.device_model, p.sku, 'Y6B') AS device_model,
                supp.name AS supplier,
                b.branch_name,
                b.branch_code,
                (st.unit_price + COALESCE(st.discount_amount, 0.00)) AS price,
                COALESCE(st.discount_percent, 0.00) AS discount_percent,
                COALESCE(st.discount_amount, 0.00) AS discount_amount,
                st.unit_price AS final_price,
                'USD' AS currency,
                COALESCE(st.warranty_expired_date, (st.created_at::date + INTERVAL '90 days')::date) AS warranty_end_date,
                st.created_at AS warranty_start_date,
                st.reference_no AS invoice_reference,
                st.remarks AS notes,
                COALESCE(st.quantity, 1) AS quantity,
                COALESCE(d.status::text, 'COMPLETED') AS status,
                st.created_at
            FROM v_sales st
            LEFT JOIN products p ON st.product_id = p.id
            LEFT JOIN branches b ON st.branch_id = b.branch_id
            LEFT JOIN LATERAL (
                SELECT dev.* FROM devices dev WHERE dev.device_id = st.serial_number
                ORDER BY dev.id DESC LIMIT 1
            ) d ON true
            LEFT JOIN products dp ON dp.id = d.product_id
            LEFT JOIN merchants m ON (d.merchant_id = m.id OR d.merchant_id::text = m.merchant_id::text)
            LEFT JOIN suppliers supp ON supp.id = COALESCE(dp.supplier_id, p.supplier_id)
            LEFT JOIN LATERAL (
                SELECT usr.full_name
                FROM inventory_logs il
                JOIN inventory_serials ins ON il.inventory_serial_id = ins.id
                LEFT JOIN users usr ON il.changed_by = usr.id
                WHERE ins.serial_number = st.serial_number AND il.new_status = 'SOLD'
                ORDER BY il.id DESC LIMIT 1
            ) u ON true
            WHERE {where_sql}
            ORDER BY st.transaction_id DESC
            LIMIT ${idx} OFFSET ${idx + 1}
        """
        params.extend([limit, offset])
        rows = await conn.fetch(data_query, *params)

        sales = []
        for r in rows:
            remarks = r["notes"] or ""
            pm = "QR_SCAN" if ("Payment: QR_SCAN" in remarks or "QR Scan" in remarks or "KHQR" in remarks) else "CASH"

            # Parse customer name if stored in remarks
            cust_name = r["customer_name"]
            cust_phone = r["customer_phone"]
            if "Customer: " in remarks:
                try:
                    c_part = remarks.split("Customer: ")[1].split(" | ")[0].strip()
                    if c_part and c_part != "N/A":
                        cust_name = c_part
                except Exception:
                    pass
            if "Phone: " in remarks:
                try:
                    p_part = remarks.split("Phone: ")[1].split(" | ")[0].strip()
                    if p_part and p_part != "N/A":
                        cust_phone = p_part
                except Exception:
                    pass

            # Calculate warranty days
            w_days = 90
            if r["warranty_start_date"] and r["warranty_end_date"]:
                try:
                    w_days = (r["warranty_end_date"] - r["warranty_start_date"].date()).days
                except Exception:
                    w_days = 90

            sales.append({
                "id": r["id"],
                "device_id": r["device_id"],
                "device_sn": r["device_sn"],
                "merchant_id": r["merchant_id"],
                "store_name": r["store_name"],
                "seller_name": r["seller_name"],
                "device_type": r["device_type"],
                "device_model": r["device_model"],
                "supplier": r["supplier"],
                "branch_name": r["branch_name"],
                "branch_code": r["branch_code"],
                "customer_name": cust_name,
                "customer_phone": cust_phone,
                "price": float(r["price"] or 0.0),
                "discount_type": "AMOUNT" if float(r["discount_amount"] or 0.0) > 0 else "NONE",
                "discount_percent": float(r["discount_percent"] or 0.0),
                "discount_amount": float(r["discount_amount"] or 0.0),
                "final_price": float(r["final_price"] or 0.0),
                "currency": r["currency"] or "USD",
                "warranty_days": w_days,
                "warranty_start_date": r["warranty_start_date"].isoformat() if r["warranty_start_date"] else None,
                "warranty_end_date": r["warranty_end_date"].isoformat() if r["warranty_end_date"] else None,
                "payment_method": pm,
                "status": "COMPLETED" if r["status"] in ('ACTIVE', 'COMPLETED') else r["status"],
                "notes": r["notes"],
                "quantity": int(r["quantity"] or 1),
                "invoice_reference": r["invoice_reference"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            })

    return {
        "status": "success",
        "total": total_count,
        "total_count": total_count,
        "total_revenue": total_revenue,
        "data": sales
    }


@router.get("/{sale_id}", response_model=Dict[str, Any])
async def get_sale_detail(
    sale_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves single sale order details from the sales view (pos_invoices + pos_invoice_items)."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT
                st.transaction_id AS id,
                st.serial_number AS device_sn,
                d.id AS device_id,
                d.merchant_id,
                COALESCE(m.merchant_name, m.name) AS store_name,
                COALESCE(m.owner_phone, '') AS customer_phone,
                COALESCE(m.name, m.merchant_name) AS customer_name,
                COALESCE(u.full_name, 'System Admin') AS seller_name,
                COALESCE(dp.name, p.name, 'Display Soundbox') AS device_type,
                COALESCE(dp.device_model, p.device_model, p.sku, 'Y6B') AS device_model,
                supp.name AS supplier,
                b.branch_name,
                b.branch_code,
                (st.unit_price + COALESCE(st.discount_amount, 0.00)) AS price,
                COALESCE(st.discount_percent, 0.00) AS discount_percent,
                COALESCE(st.discount_amount, 0.00) AS discount_amount,
                st.unit_price AS final_price,
                'USD' AS currency,
                COALESCE(st.warranty_expired_date, (st.created_at::date + INTERVAL '90 days')::date) AS warranty_end_date,
                st.created_at AS warranty_start_date,
                st.reference_no AS invoice_reference,
                st.remarks AS notes,
                COALESCE(st.quantity, 1) AS quantity,
                COALESCE(d.status::text, 'COMPLETED') AS status,
                st.created_at
            FROM v_sales st
            LEFT JOIN products p ON st.product_id = p.id
            LEFT JOIN branches b ON st.branch_id = b.branch_id
            LEFT JOIN LATERAL (
                SELECT dev.* FROM devices dev WHERE dev.device_id = st.serial_number
                ORDER BY dev.id DESC LIMIT 1
            ) d ON true
            LEFT JOIN products dp ON dp.id = d.product_id
            LEFT JOIN merchants m ON (d.merchant_id = m.id OR d.merchant_id::text = m.merchant_id::text)
            LEFT JOIN suppliers supp ON supp.id = COALESCE(dp.supplier_id, p.supplier_id)
            LEFT JOIN LATERAL (
                SELECT usr.full_name
                FROM inventory_logs il
                JOIN inventory_serials ins ON il.inventory_serial_id = ins.id
                LEFT JOIN users usr ON il.changed_by = usr.id
                WHERE ins.serial_number = st.serial_number AND il.new_status = 'SOLD'
                ORDER BY il.id DESC LIMIT 1
            ) u ON true
            WHERE st.transaction_id = $1
        """, sale_id)

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sale order with ID {sale_id} not found."
            )

        data = dict(row)
        for dt_field in ("warranty_start_date", "warranty_end_date", "created_at"):
            if data.get(dt_field):
                data[dt_field] = data[dt_field].isoformat()
        for num_field in ("price", "discount_percent", "discount_amount", "final_price"):
            if data.get(num_field) is not None:
                data[num_field] = float(data[num_field])

    return {"status": "success", "sale": data}


@router.get("/device/{device_sn_or_id}", response_model=Dict[str, Any])
async def get_device_sales_history(
    device_sn_or_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves deployment / sales history for a specific device from the sales view."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT
                st.transaction_id AS id,
                st.serial_number AS device_sn,
                d.id AS device_id,
                d.merchant_id,
                COALESCE(m.merchant_name, m.name) AS store_name,
                COALESCE(u.full_name, 'System Admin') AS seller_name,
                (st.unit_price + COALESCE(st.discount_amount, 0.00)) AS price,
                COALESCE(st.discount_percent, 0.00) AS discount_percent,
                COALESCE(st.discount_amount, 0.00) AS discount_amount,
                st.unit_price AS final_price,
                st.reference_no AS invoice_reference,
                st.remarks AS notes,
                st.created_at AS warranty_start_date,
                st.warranty_expired_date AS warranty_end_date,
                st.created_at
            FROM v_sales st
            LEFT JOIN LATERAL (
                SELECT dev.* FROM devices dev WHERE dev.device_id = st.serial_number
                ORDER BY dev.id DESC LIMIT 1
            ) d ON true
            LEFT JOIN merchants m ON (d.merchant_id = m.id OR d.merchant_id::text = m.merchant_id::text)
            LEFT JOIN LATERAL (
                SELECT usr.full_name
                FROM inventory_logs il
                JOIN inventory_serials ins ON il.inventory_serial_id = ins.id
                LEFT JOIN users usr ON il.changed_by = usr.id
                WHERE ins.serial_number = st.serial_number AND il.new_status = 'SOLD'
                ORDER BY il.id DESC LIMIT 1
            ) u ON true
            WHERE (st.serial_number = $1 OR d.id::text = $1)
            ORDER BY st.transaction_id DESC
        """, device_sn_or_id)

        sales = []
        for r in rows:
            item = dict(r)
            for dt_field in ("warranty_start_date", "warranty_end_date", "created_at"):
                if item.get(dt_field):
                    item[dt_field] = item[dt_field].isoformat()
            for num_field in ("price", "discount_percent", "discount_amount", "final_price"):
                if item.get(num_field) is not None:
                    item[num_field] = float(item[num_field])
            sales.append(item)

    return {"status": "success", "total": len(sales), "sales": sales}
