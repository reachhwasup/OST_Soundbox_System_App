from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import json
import logging

from backend.database import get_db_pool
from backend.security import get_current_user, require_admin, require_permission, can_view_cost
from backend.services import stock as stock_service
from backend.scoping import effective_branch_id as scoped_branch_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/products", tags=["Products & Stock Management"])

# Catalog defaults for a product created without them (the Manage Product form does not ask)
DEFAULT_MIN_STOCK_LEVEL = 5
DEFAULT_WARRANTY_MONTHS = 3


# --- Schemas ---

class ProductCreateSchema(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    base_price: float = Field(0.00, ge=0, description="Selling price (what the customer pays)")
    purchase_price: Optional[float] = Field(None, ge=0, description="Cost from the supplier")
    default_warranty_months: Optional[int] = 3
    min_stock_level: Optional[int] = Field(None, ge=0, description="Reorder level; low-stock warning at or below it")
    device_model: Optional[str] = Field(None, max_length=120, description="Hardware model code (defaults to the SKU)")
    supplier_id: Optional[int] = Field(None, description="Supplier this product comes from")
    is_order: Optional[int] = None


class ProductUpdateSchema(BaseModel):
    sku: Optional[str] = Field(None, min_length=2, max_length=50)
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    base_price: Optional[float] = Field(None, ge=0, description="Selling price (what the customer pays)")
    purchase_price: Optional[float] = Field(None, ge=0, description="Cost from the supplier")
    default_warranty_months: Optional[int] = Field(None, ge=0)
    min_stock_level: Optional[int] = Field(None, ge=0, description="Reorder level; low-stock warning at or below it")
    clear_min_stock_level: bool = Field(False, description="Remove the reorder level (no low-stock warning)")
    device_model: Optional[str] = Field(None, max_length=120)
    supplier_id: Optional[int] = Field(None, description="Supplier this product comes from")
    clear_supplier: bool = Field(False, description="Detach the supplier from this product")
    is_order: Optional[int] = None
    is_active: Optional[bool] = None


class StockIntakeSchema(BaseModel):
    serial_numbers: List[str] = Field(..., min_length=1, description="List of serial numbers to intake")
    product_id: Optional[int] = Field(None, description="Product catalog ID (defaults to Y6B soundbox if omitted)")
    branch_id: Optional[int] = Field(None, description="Target branch ID. Auto-assigned for branch admins.")
    unit_price: Optional[float] = Field(None, description="Base price per unit for this batch (defaults to products.base_price)")
    cost_price: Optional[float] = Field(None, ge=0, description="Purchase price per unit (defaults to products.purchase_price)")
    supplier_id: Optional[int] = None
    notes: Optional[str] = None


class StockTransferSchema(BaseModel):
    serial_numbers: List[str] = Field(..., min_length=1)
    from_branch_id: int
    to_branch_id: int
    remarks: Optional[str] = None


# --- Product Catalog Endpoints ---

@router.get("/")
async def list_products(
    include_inactive: bool = Query(False, description="Also return products that have been deactivated"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Returns list of all catalog products and their pricing."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        products = await conn.fetch(f"""
            SELECT
                p.id,
                p.sku,
                p.name,
                p.base_price,
                p.purchase_price,
                p.default_warranty_months,
                p.is_order,
                p.is_active,
                p.created_at,
                p.min_stock_level,
                p.device_model,
                p.supplier_id,
                p.name AS device_type,
                s.name AS supplier_name
            FROM products p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            {"" if include_inactive else "WHERE p.is_active = TRUE"}
            ORDER BY p.is_order ASC NULLS LAST, p.id ASC;
        """)

        show_cost = can_view_cost(current_user)
        data = []
        for p in products:
            selling = float(p["base_price"]) if p["base_price"] is not None else 0.0
            cost = float(p["purchase_price"]) if p["purchase_price"] is not None else None
            item = {
                **dict(p),
                "base_price": selling,
                "purchase_price": cost,
                # Names kept for existing clients
                "product_name": p["name"] or p["sku"],
                "model_code": p["sku"],
                "unit_price": selling,
                "warranty_months": p["default_warranty_months"],
                "created_at": p["created_at"].isoformat() if p["created_at"] else None,
            }
            # Only the cost is privileged; the selling price is what everyone quotes
            if not show_cost:
                item["purchase_price"] = None
            data.append(item)

        return {"status": "success", "can_view_cost": show_cost, "data": data}


@router.post("/")
async def create_product(
    payload: ProductCreateSchema,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Creates a new product in the catalog.

    A product carries its own hardware details: the product name is the device type, `device_model`
    is the hardware model code (defaulting to the SKU) and `supplier_id` is who it comes from.
    """
    code = payload.sku.strip()
    name = payload.name.strip()
    model = (payload.device_model or "").strip() or code

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM products WHERE LOWER(sku) = LOWER($1)", code)
        if existing:
            raise HTTPException(status_code=400, detail=f"Product with SKU '{code}' already exists.")
        await _require_supplier(conn, payload.supplier_id)

        row = await conn.fetchrow("""
            INSERT INTO products (
                sku, name, base_price, purchase_price, default_warranty_months, min_stock_level,
                device_model, supplier_id, is_order, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
            RETURNING *
        """, code, name, payload.base_price, payload.purchase_price,
           payload.default_warranty_months if payload.default_warranty_months is not None else DEFAULT_WARRANTY_MONTHS,
           payload.min_stock_level if payload.min_stock_level is not None else DEFAULT_MIN_STOCK_LEVEL,
           model, payload.supplier_id, payload.is_order)

        return {
            "status": "success",
            "message": f"Product '{name}' created successfully.",
            "data": dict(row)
        }


async def _require_supplier(conn, supplier_id: Optional[int]) -> None:
    """Refuses a supplier id that does not exist (a product must never point at a missing supplier)."""
    if supplier_id is None:
        return
    if not await conn.fetchval("SELECT id FROM suppliers WHERE id = $1", supplier_id):
        raise HTTPException(status_code=400, detail=f"Supplier ID {supplier_id} does not exist.")


@router.put("/{product_id}")
async def update_product(
    product_id: int,
    payload: ProductUpdateSchema,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Updates catalog fields of a product, including its reorder level (min_stock_level)."""
    if (payload.purchase_price is not None) and not can_view_cost(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to change the purchase price.")

    updates, params = [], [product_id]
    fields = {
        "sku": payload.sku.strip() if payload.sku else None,
        "name": payload.name.strip() if payload.name else None,
        "device_model": payload.device_model.strip() if payload.device_model else None,
        "supplier_id": payload.supplier_id,
        "base_price": payload.base_price,
        "purchase_price": payload.purchase_price,
        "default_warranty_months": payload.default_warranty_months,
        "min_stock_level": payload.min_stock_level,
        "is_order": payload.is_order,
        "is_active": payload.is_active,
    }
    for column, value in fields.items():
        if value is not None:
            params.append(value)
            updates.append(f"{column} = ${len(params)}")
    if payload.clear_min_stock_level:
        updates.append("min_stock_level = NULL")
    if payload.clear_supplier:
        updates.append("supplier_id = NULL")
    if not updates:
        raise HTTPException(status_code=400, detail="No changes requested.")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        if payload.sku:
            clash = await conn.fetchval(
                "SELECT id FROM products WHERE LOWER(sku) = LOWER($1) AND id <> $2", payload.sku.strip(), product_id
            )
            if clash:
                raise HTTPException(status_code=409, detail=f"Another product already uses SKU '{payload.sku.strip()}'.")
        await _require_supplier(conn, payload.supplier_id)

        row = await conn.fetchrow(
            f"UPDATE products SET {', '.join(updates)} WHERE id = $1 RETURNING id, sku, name, min_stock_level",
            *params
        )
        if not row:
            raise HTTPException(status_code=404, detail=f"Product ID {product_id} not found.")
        return {"status": "success", "message": f"Product '{row['name'] or row['sku']}' updated.", "data": dict(row)}


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Deletes a product that has never been stocked, otherwise deactivates it so history stays intact."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, sku, name, is_active FROM products WHERE id = $1", product_id)
        if not row:
            raise HTTPException(status_code=404, detail=f"Product ID {product_id} not found.")

        label = row["name"] or row["sku"]
        movements = await conn.fetchval("SELECT COUNT(*) FROM pos_invoice_items WHERE product_id = $1", product_id)
        serials = await conn.fetchval("SELECT COUNT(*) FROM inventory_serials WHERE product_id = $1", product_id)
        if movements or serials:
            await conn.execute("UPDATE products SET is_active = FALSE WHERE id = $1", product_id)
            return {
                "status": "success",
                "message": f"'{label}' has stock history ({movements} movement(s)), so it was deactivated instead of deleted.",
                "data": {"id": product_id, "deactivated": True},
            }

        await conn.execute("DELETE FROM products WHERE id = $1", product_id)
        return {"status": "success", "message": f"Product '{label}' deleted.",
                "data": {"id": product_id, "deactivated": False}}


# --- Warehouse Stock Endpoints (Branch-Scoped) ---

@router.get("/stock")
async def get_branch_stock(
    search: Optional[str] = Query(None, description="Search serial number, product name, or supplier"),
    branch_id: Optional[int] = Query(None, description="Filter by branch (SuperAdmin only)"),
    product_id: Optional[int] = Query(None, description="Filter by product"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns serial-tracked warehouse stock from v_branch_product_stock.
    `device_row_id` is the matching devices.id (use it for device edit/delete/sale), or null.
    Branch scoping enforced:
    - If user is assigned to a specific branch, they ONLY receive stock for that branch.
    - If user is SuperAdmin (branch_id IS NULL), they can view all or filter by ?branch_id=X.
    """
    user_branch_id = current_user.get("branch_id")
    effective_branch_id = scoped_branch_id(current_user, branch_id)

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        where_clauses = ["1=1"]
        params = []
        param_idx = 1

        if effective_branch_id is not None:
            where_clauses.append(f"v.branch_id = ${param_idx}")
            params.append(effective_branch_id)
            param_idx += 1

        if product_id is not None:
            where_clauses.append(f"v.product_id = ${param_idx}")
            params.append(product_id)
            param_idx += 1

        if search and search.strip():
            s = f"%{search.strip()}%"
            where_clauses.append(f"""(
                v.serial_number ILIKE ${param_idx}
                OR v.sku ILIKE ${param_idx}
                OR v.product_name ILIKE ${param_idx}
                OR v.supplier ILIKE ${param_idx}
                OR v.notes ILIKE ${param_idx}
            )""")
            params.append(s)
            param_idx += 1

        where_sql = " AND ".join(where_clauses)

        query = f"""
            SELECT
                v.transaction_id AS id,
                v.transaction_id,
                d.id AS device_row_id,
                d.status::text AS device_status,
                d.merchant_id,
                COALESCE(m.merchant_name, m.name) AS store_name,
                GREATEST(CURRENT_DATE - v.intake_date::date, 0) AS days_in_stock,
                v.serial_number,
                v.serial_number AS device_sn,
                v.serial_number AS device_id,
                v.product_name AS device_type,
                COALESCE(v.device_model, v.sku) AS device_model,
                v.product_id,
                v.branch_id,
                v.branch_name,
                v.branch_code,
                v.price,
                v.price AS final_price,
                -- Base price = original cost from the supplier for this serial
                COALESCE(inv.purchase_price, p.purchase_price, 0.00) AS purchase_price,
                p.purchase_price AS product_purchase_price,
                v.warranty_months,
                COALESCE(v.warranty_months, 12) * 30 AS warranty_days,
                v.supplier,
                'IN_STOCK' AS status,
                v.intake_date AS created_at,
                v.intake_date AS last_time,
                v.intake_date AS last_heartbeat,
                v.notes,
                '100%' AS battery,
                'Good' AS signal
            FROM v_branch_product_stock v
            JOIN products p ON p.id = v.product_id
            LEFT JOIN LATERAL (
                SELECT dev.id, dev.status, dev.merchant_id FROM devices dev WHERE dev.device_id = v.serial_number
                ORDER BY dev.id DESC LIMIT 1
            ) d ON true
            LEFT JOIN merchants m ON m.id = d.merchant_id
            LEFT JOIN inventory_serials inv ON inv.serial_number = v.serial_number
            WHERE {where_sql}
            ORDER BY v.transaction_id DESC;
        """

        rows = await conn.fetch(query, *params)

        show_cost = can_view_cost(current_user)
        formatted_stock = []
        for r in rows:
            d = dict(r)
            d["purchase_price"] = (float(d["purchase_price"]) if d.get("purchase_price") is not None else 0.0) if show_cost else None
            d["product_purchase_price"] = float(d["product_purchase_price"]) if show_cost and d.get("product_purchase_price") is not None else None
            cat = d.get("created_at")
            d["created_at"] = cat.isoformat() if hasattr(cat, "isoformat") else (str(cat) if cat else None)
            d["last_time"] = d["created_at"]
            d["last_heartbeat"] = d["created_at"]
            formatted_stock.append(d)

        return {
            "status": "success",
            "branch_id": effective_branch_id,
            "branch_name": current_user.get("branch_name") if user_branch_id else "All Branches",
            "total": len(formatted_stock),
            "can_view_cost": show_cost,
            "devices": formatted_stock,
            "data": formatted_stock
        }


@router.get("/stock/summary")
async def get_branch_stock_summary(
    search: Optional[str] = Query(None, description="Search product name, SKU, model, type or supplier"),
    branch_id: Optional[int] = Query(None, description="Filter by branch (SuperAdmin only)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Warehouse stock per product (one row per product, including products with no stock):
    product name and SKU, model and supplier, quantity (with a per-branch breakdown), supplier-cost
    base price and stock value, last stock-in date, reorder level and low-stock flag.
    Branch scoping is enforced the same way as /stock. Cost fields are null without cost permission.
    """
    user_branch_id = current_user.get("branch_id")
    effective_branch_id = scoped_branch_id(current_user, branch_id)
    search_like = f"%{search.strip()}%" if search and search.strip() else None
    show_cost = can_view_cost(current_user)

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            WITH stock AS (
                SELECT v.product_id, v.branch_id, v.branch_name, v.branch_code, v.serial_number, v.intake_date,
                       COALESCE(inv.purchase_price, p.purchase_price, 0) AS unit_cost
                FROM v_branch_product_stock v
                JOIN products p ON p.id = v.product_id
                LEFT JOIN inventory_serials inv ON inv.serial_number = v.serial_number
                WHERE ($1::int IS NULL OR v.branch_id = $1::int)
            ),
            per_branch AS (
                SELECT product_id, branch_id, branch_name, branch_code, COUNT(*)::int AS quantity
                FROM stock
                GROUP BY product_id, branch_id, branch_name, branch_code
            )
            SELECT
                p.id AS product_id,
                p.sku,
                COALESCE(p.name, p.sku) AS product_name,
                p.base_price,
                p.purchase_price,
                p.default_warranty_months,
                p.min_stock_level,
                p.is_order,
                p.device_model,
                p.name AS type_name,
                s.name AS supplier,
                COUNT(st.serial_number)::int AS available_quantity,
                COALESCE(SUM(st.unit_cost), 0) AS stock_value,
                MAX(st.intake_date) AS last_intake,
                COALESCE((
                    SELECT json_agg(json_build_object(
                        'branch_id', pb.branch_id, 'branch_name', pb.branch_name,
                        'branch_code', pb.branch_code, 'quantity', pb.quantity
                    ) ORDER BY pb.branch_name)
                    FROM per_branch pb WHERE pb.product_id = p.id
                ), '[]'::json) AS branches
            FROM products p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            LEFT JOIN stock st ON st.product_id = p.id
            WHERE ($2::text IS NULL
                   OR p.name ILIKE $2 OR p.sku ILIKE $2
                   OR p.device_model ILIKE $2 OR s.name ILIKE $2)
            GROUP BY p.id, s.name
            HAVING p.is_active = TRUE OR COUNT(st.serial_number) > 0
            ORDER BY p.is_order ASC NULLS LAST, p.id ASC;
        """, effective_branch_id, search_like)

        summary = []
        for r in rows:
            qty = r["available_quantity"]
            level = r["min_stock_level"]
            branches = r["branches"]
            if isinstance(branches, str):
                branches = json.loads(branches)
            summary.append({
                "id": str(r["product_id"]),
                "product_id": r["product_id"],
                "sku": r["sku"],
                "product_name": r["product_name"],
                "device_type": r["product_name"],  # kept for existing clients
                "product_code": r["sku"],          # kept for existing clients
                "type_name": r["type_name"],
                "device_model": r["device_model"],
                "default_warranty_months": r["default_warranty_months"],
                "supplier": r["supplier"],
                "available_quantity": qty,
                "branches": branches,
                "base_price": float(r["base_price"]) if r["base_price"] is not None else None,
                "purchase_price": (float(r["purchase_price"]) if r["purchase_price"] is not None else None) if show_cost else None,
                "stock_value": float(r["stock_value"]) if show_cost else None,
                "last_intake": r["last_intake"].isoformat() if r["last_intake"] else None,
                "min_stock_level": level,
                "is_low": level is not None and qty <= level,
                "is_order": r["is_order"],
            })

        return {
            "status": "success",
            "branch_id": effective_branch_id,
            "branch_name": current_user.get("branch_name") if user_branch_id else "All Branches",
            "can_view_cost": show_cost,
            "total_lines": len(summary),
            "total_units": sum(x["available_quantity"] for x in summary),
            "total_value": round(sum(x["stock_value"] or 0 for x in summary), 2) if show_cost else None,
            "low_stock_count": sum(1 for x in summary if x["is_low"]),
            "data": summary
        }


@router.post("/stock/intake", status_code=status.HTTP_201_CREATED)
async def intake_stock(
    payload: StockIntakeSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Intakes single or bulk serial numbers into branch warehouse stock.
    Automatically assigns user's branch unless SuperAdmin specifies another branch.
    """
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only administrators can intake warehouse stock.")

    user_branch_id = current_user.get("branch_id")
    target_branch_id = user_branch_id or payload.branch_id or 1

    # Trim and de-duplicate while keeping the entered order
    clean_sns = list(dict.fromkeys(sn.strip() for sn in payload.serial_numbers if sn and sn.strip()))
    if not clean_sns:
        raise HTTPException(status_code=400, detail="At least one valid serial number is required.")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Verify branch exists
        branch = await conn.fetchrow("SELECT branch_id, branch_name FROM branches WHERE branch_id = $1", target_branch_id)
        if not branch:
            raise HTTPException(status_code=400, detail=f"Branch ID {target_branch_id} does not exist.")

        # Resolve product (explicit product_id, else first active product)
        if payload.product_id:
            product = await conn.fetchrow("""
                SELECT id, sku, name, base_price, purchase_price
                FROM products WHERE id = $1 AND is_active = TRUE
            """, payload.product_id)
            if not product:
                raise HTTPException(status_code=400, detail=f"Product ID {payload.product_id} does not exist or is inactive.")
        else:
            product = await conn.fetchrow("""
                SELECT id, sku, name, base_price, purchase_price
                FROM products WHERE is_active = TRUE ORDER BY is_order ASC NULLS LAST, id ASC LIMIT 1
            """)
            if not product:
                raise HTTPException(status_code=400, detail="No active products found in catalog. Please create a product first.")

        target_product_id = product["id"]
        # Base price = what this batch sells for; the form may set it, else the product's own
        if payload.unit_price is not None:
            unit_price = float(payload.unit_price)
        elif product["base_price"] is not None:
            unit_price = float(product["base_price"])
        else:
            unit_price = 0.00

        # Purchase price = cost from the supplier, carried by the product
        if payload.cost_price is not None and can_view_cost(current_user):
            cost_price = float(payload.cost_price)
        elif product["purchase_price"] is not None:
            cost_price = float(product["purchase_price"])
        else:
            cost_price = 0.00

        try:
            count = await stock_service.record_stock_in(
                conn,
                serials=clean_sns,
                product_id=target_product_id,
                branch_id=target_branch_id,
                unit_price=unit_price,
                cost_price=cost_price,
                remarks=payload.notes or f"Intake by {current_user.get('full_name') or current_user.get('phone_number')}",
            )
        except stock_service.StockError as e:
            raise HTTPException(status_code=400, detail=str(e))

        return {
            "status": "success",
            "message": f"Successfully intaked {count} serials into {branch['branch_name']}.",
            "count": count,
            "branch_id": target_branch_id,
            "branch_name": branch["branch_name"]
        }


@router.post("/stock/transfer")
async def transfer_stock(
    payload: StockTransferSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Transfers serial numbers from one branch to another.
    """
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only administrators can transfer stock between branches.")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        from_branch = await conn.fetchrow("SELECT branch_name FROM branches WHERE branch_id = $1", payload.from_branch_id)
        to_branch = await conn.fetchrow("SELECT branch_name FROM branches WHERE branch_id = $1", payload.to_branch_id)
        if not from_branch or not to_branch:
            raise HTTPException(status_code=404, detail="Source or destination branch not found.")
        try:
            count = await stock_service.transfer_stock(
                conn,
                serials=payload.serial_numbers,
                from_branch_id=payload.from_branch_id,
                to_branch_id=payload.to_branch_id,
                from_branch_name=from_branch["branch_name"],
                to_branch_name=to_branch["branch_name"],
                remarks=payload.remarks,
            )
        except stock_service.StockError as e:
            raise HTTPException(status_code=400, detail=str(e))

        return {
            "status": "success",
            "message": f"Successfully transferred {count} serials from {from_branch['branch_name']} to {to_branch['branch_name']}.",
            "count": count
        }
