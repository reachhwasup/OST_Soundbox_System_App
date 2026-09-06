import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Union

from backend.database import get_db_pool
from backend.security import get_current_user, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sales", tags=["Sales"])


class SaleCreateSchema(BaseModel):
    device_id: int = Field(..., description="Device ID to sell")
    device_sn: Optional[str] = None
    merchant_id: Optional[Union[int, str]] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    price: float = Field(29.00, ge=0)
    discount_type: str = "NONE"
    discount_percent: float = Field(0.0, ge=0, le=100)
    discount_amount: float = Field(0.0, ge=0)
    final_price: float = Field(29.00, ge=0)
    currency: str = "USD"
    warranty_days: int = Field(90, ge=0)
    warranty_start_date: Optional[str] = None
    warranty_end_date: Optional[str] = None
    payment_method: str = "CASH"
    notes: Optional[str] = None
    target_status: str = "PENDING"  # 'PENDING' (waiting for QR registration) or 'ACTIVE'


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_device_sale(
    payload: SaleCreateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Records a new device sale transaction, creates a ledger entry in the sales table,
    and updates the soundbox device's warranty and lifecycle status.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # 1. Verify device exists
        device = await conn.fetchrow("""
            SELECT id, device_sn, device_type, device_model, status, merchant_id
            FROM devices WHERE id = $1
        """, payload.device_id)

        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device with ID {payload.device_id} not found."
            )

        device_sn = payload.device_sn or device["device_sn"]

        # 2. Compute Dates
        if payload.warranty_start_date:
            try:
                start_dt = datetime.fromisoformat(payload.warranty_start_date.replace("Z", "+00:00"))
            except Exception:
                start_dt = datetime.now(timezone.utc)
        else:
            start_dt = datetime.now(timezone.utc)

        if payload.warranty_end_date:
            try:
                end_dt = datetime.fromisoformat(payload.warranty_end_date.replace("Z", "+00:00"))
            except Exception:
                end_dt = start_dt + timedelta(days=payload.warranty_days)
        else:
            end_dt = start_dt + timedelta(days=payload.warranty_days)

        # 3. Resolve merchant_id integer
        target_merchant_id = None
        if payload.merchant_id is not None:
            try:
                target_merchant_id = int(payload.merchant_id)
            except Exception:
                target_merchant_id = None

        sold_by_id = current_user.get("id")

        # 4. Insert into sales table
        sale_row = await conn.fetchrow("""
            INSERT INTO sales (
                device_id, device_sn, merchant_id, sold_by_user_id,
                customer_name, customer_phone, price, discount_type,
                discount_percent, discount_amount, final_price, currency,
                warranty_days, warranty_start_date, warranty_end_date,
                payment_method, status, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'COMPLETED', $17)
            RETURNING *
        """,
            device["id"],
            device_sn,
            target_merchant_id,
            sold_by_id,
            payload.customer_name,
            payload.customer_phone,
            payload.price,
            payload.discount_type,
            payload.discount_percent,
            payload.discount_amount,
            payload.final_price,
            payload.currency,
            payload.warranty_days,
            start_dt,
            end_dt,
            payload.payment_method,
            payload.notes
        )

        # 5. Synchronize device state
        target_status = payload.target_status if payload.target_status in ('ACTIVE', 'PENDING') else 'PENDING'
        is_active = True if target_status == 'ACTIVE' else False

        await conn.execute("""
            UPDATE devices SET
                status = $1::device_status,
                is_active = $2,
                price = $3,
                discount_amount = $4,
                discount_percent = $5,
                final_price = $6,
                warranty_days = $7,
                warranty_start_date = $8,
                warranty_end_date = $9,
                merchant_id = COALESCE($10, merchant_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $11
        """,
            target_status,
            is_active,
            payload.price,
            payload.discount_amount,
            payload.discount_percent,
            payload.final_price,
            payload.warranty_days,
            start_dt,
            end_dt,
            str(target_merchant_id) if target_merchant_id is not None else None,
            device["id"]
        )

    sale_dict = dict(sale_row)
    if sale_dict.get("warranty_start_date"):
        sale_dict["warranty_start_date"] = sale_dict["warranty_start_date"].isoformat()
    if sale_dict.get("warranty_end_date"):
        sale_dict["warranty_end_date"] = sale_dict["warranty_end_date"].isoformat()
    if sale_dict.get("created_at"):
        sale_dict["created_at"] = sale_dict["created_at"].isoformat()
    if sale_dict.get("updated_at"):
        sale_dict["updated_at"] = sale_dict["updated_at"].isoformat()

    return {
        "status": "success",
        "message": f"Sale for device '{device_sn}' recorded successfully.",
        "sale": sale_dict
    }


@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
async def list_sales(
    search: Optional[str] = Query(None, description="Search device SN, customer, or merchant"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lists device sales orders with revenue summaries and pagination."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        where_clauses = ["1=1"]
        params = []
        idx = 1

        if search and search.strip():
            s_clean = f"%{search.strip()}%"
            where_clauses.append(f"""
                (s.device_sn ILIKE ${idx} OR 
                 s.customer_name ILIKE ${idx} OR 
                 s.customer_phone ILIKE ${idx} OR 
                 COALESCE(m.merchant_name, m.name) ILIKE ${idx})
            """)
            params.append(s_clean)
            idx += 1

        where_sql = " AND ".join(where_clauses)

        # 1. Total Count and Revenue
        stats_query = f"""
            SELECT COUNT(s.id)::int AS total_count,
                   COALESCE(SUM(s.final_price), 0.00)::numeric(12,2) AS total_revenue
            FROM sales s
            LEFT JOIN merchants m ON s.merchant_id = m.id
            WHERE {where_sql}
        """
        stats_row = await conn.fetchrow(stats_query, *params)
        total_count = stats_row["total_count"] if stats_row else 0
        total_revenue = float(stats_row["total_revenue"]) if stats_row else 0.0

        # 2. Data rows
        data_query = f"""
            SELECT s.id, s.device_id, s.device_sn, s.merchant_id, s.sold_by_user_id,
                   s.customer_name, s.customer_phone,
                   s.price, s.discount_type, s.discount_percent, s.discount_amount, s.final_price, s.currency,
                   s.warranty_days, s.warranty_start_date, s.warranty_end_date,
                   s.payment_method, s.status, s.notes, s.created_at,
                   COALESCE(m.merchant_name, m.name) AS store_name,
                   u.full_name AS seller_name,
                   d.device_type,
                   COALESCE(supp.name, d.supplier, 'Feishu') AS supplier
            FROM sales s
            LEFT JOIN merchants m ON s.merchant_id = m.id
            LEFT JOIN users u ON s.sold_by_user_id = u.id
            LEFT JOIN devices d ON s.device_id = d.id
            LEFT JOIN suppliers supp ON d.supplier_id = supp.id
            WHERE {where_sql}
            ORDER BY s.id DESC
            LIMIT ${idx} OFFSET ${idx + 1}
        """
        params.extend([limit, offset])
        rows = await conn.fetch(data_query, *params)

        sales = []
        for r in rows:
            sales.append({
                "id": r["id"],
                "device_id": r["device_id"],
                "device_sn": r["device_sn"],
                "merchant_id": r["merchant_id"],
                "store_name": r["store_name"],
                "seller_name": r["seller_name"],
                "device_type": r["device_type"] or "Display Soundbox",
                "supplier": r["supplier"] or "Feishu",
                "customer_name": r["customer_name"],
                "customer_phone": r["customer_phone"],
                "price": float(r["price"] or 0.0),
                "discount_type": r["discount_type"],
                "discount_percent": float(r["discount_percent"] or 0.0),
                "discount_amount": float(r["discount_amount"] or 0.0),
                "final_price": float(r["final_price"] or 0.0),
                "currency": r["currency"] or "USD",
                "warranty_days": r["warranty_days"] or 90,
                "warranty_start_date": r["warranty_start_date"].isoformat() if r["warranty_start_date"] else None,
                "warranty_end_date": r["warranty_end_date"].isoformat() if r["warranty_end_date"] else None,
                "payment_method": r["payment_method"] or "CASH",
                "status": r["status"] or "COMPLETED",
                "notes": r["notes"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            })

    return {
        "status": "success",
        "total": total_count,
        "total_revenue": total_revenue,
        "data": sales
    }


@router.get("/{sale_id}", response_model=Dict[str, Any])
async def get_sale_detail(
    sale_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves single sale order details."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT s.*,
                   COALESCE(m.merchant_name, m.name) AS store_name,
                   u.full_name AS seller_name,
                   d.device_type,
                   COALESCE(supp.name, d.supplier, 'Feishu') AS supplier
            FROM sales s
            LEFT JOIN merchants m ON s.merchant_id = m.id
            LEFT JOIN users u ON s.sold_by_user_id = u.id
            LEFT JOIN devices d ON s.device_id = d.id
            LEFT JOIN suppliers supp ON d.supplier_id = supp.id
            WHERE s.id = $1
        """, sale_id)

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sale order with ID {sale_id} not found."
            )

        data = dict(row)
        for dt_field in ("warranty_start_date", "warranty_end_date", "created_at", "updated_at"):
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
    """Retrieves sales history for a specific device by ID or serial number."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        dev_id = int(device_sn_or_id) if device_sn_or_id.isdigit() else None

        rows = await conn.fetch("""
            SELECT s.*,
                   COALESCE(m.merchant_name, m.name) AS store_name,
                   u.full_name AS seller_name
            FROM sales s
            LEFT JOIN merchants m ON s.merchant_id = m.id
            LEFT JOIN users u ON s.sold_by_user_id = u.id
            WHERE s.device_sn = $1 OR ($2::int IS NOT NULL AND s.device_id = $2::int)
            ORDER BY s.id DESC
        """, device_sn_or_id, dev_id)

        sales = []
        for r in rows:
            item = dict(r)
            for dt_field in ("warranty_start_date", "warranty_end_date", "created_at", "updated_at"):
                if item.get(dt_field):
                    item[dt_field] = item[dt_field].isoformat()
            for num_field in ("price", "discount_percent", "discount_amount", "final_price"):
                if item.get(num_field) is not None:
                    item[num_field] = float(item[num_field])
            sales.append(item)

    return {"status": "success", "total": len(sales), "sales": sales}
