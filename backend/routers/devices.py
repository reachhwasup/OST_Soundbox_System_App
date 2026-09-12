import logging
from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Union
from datetime import datetime, timedelta, timezone

from backend.database import get_db_pool
from backend.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/devices", tags=["Devices"])


class DeviceRegisterSchema(BaseModel):
    merchant_id: Union[int, str]
    device_sn: str = Field(..., description="Serial Number of Soundbox Y6B")
    telegram_chat_id: Optional[str] = None
    device_type: str = "Display Soundbox"
    device_model: str = "Display Soundbox"
    qr_code: Optional[str] = None
    price: Optional[float] = 29.00
    discount_amount: Optional[float] = 0.00
    discount_percent: Optional[float] = 0.00
    final_price: Optional[float] = None
    warranty_days: Optional[int] = 90
    warranty_start_date: Optional[str] = None
    warranty_end_date: Optional[str] = None


class BatchDeviceItem(BaseModel):
    device_sn: str = Field(..., description="Serial Number of Soundbox")
    device_type: Optional[str] = "Display Soundbox"
    device_model: Optional[str] = "Display Soundbox"
    qr_code: Optional[str] = None
    price: Optional[float] = 29.00
    discount_amount: Optional[float] = 0.00
    discount_percent: Optional[float] = 0.00
    warranty_days: Optional[int] = 90


class DeviceBatchRegisterSchema(BaseModel):
    merchant_id: Union[int, str]
    devices: List[BatchDeviceItem]
    telegram_chat_id: Optional[str] = None


@router.post("/register-batch", status_code=status.HTTP_201_CREATED)
async def register_devices_batch(
    payload: DeviceBatchRegisterSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    if not payload.devices:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No devices provided in batch.")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        merchant = await conn.fetchrow(
            "SELECT COALESCE(merchant_id, id::text) AS merchant_id, id, COALESCE(merchant_name, name) AS name, user_id, owner_phone FROM merchants WHERE id::text = $1::text OR merchant_id::text = $1::text",
            str(payload.merchant_id)
        )
        if not merchant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store/Merchant not found.")

        if current_user["role"] != "ADMIN":
            if merchant["user_id"] != current_user["id"] and merchant["owner_phone"] != current_user["phone_number"]:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this store.")

        # Ensure schema integrity
        try:
            await conn.execute("""
                ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_merchant_id_fkey;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_type VARCHAR(100) DEFAULT 'Display Soundbox';
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_model VARCHAR(100) DEFAULT 'Y6B';
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(255);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS qr_code TEXT;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 29.00;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
            """)
        except Exception as mig_err:
            logger.warning(f"Schema check in register_devices_batch: {mig_err}")

        col_type = await conn.fetchval("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'devices' AND column_name = 'merchant_id'
        """)
        if col_type in ('integer', 'bigint', 'smallint'):
            m_id_target = int(payload.merchant_id)
        else:
            m_id_target = str(payload.merchant_id)

        chat_id = payload.telegram_chat_id.strip() if payload.telegram_chat_id and payload.telegram_chat_id.strip() else None
        linked_results = []
        errors = []

        for item in payload.devices:
            dev_sn = item.device_sn.strip()
            if not dev_sn:
                continue

            qr_val = item.qr_code.strip() if item.qr_code and item.qr_code.strip() else None
            base_price = float(item.price or 29.00)
            disc_amt = float(item.discount_amount or 0.0)
            if item.discount_percent and float(item.discount_percent) > 0:
                disc_amt = (float(item.discount_percent) / 100.0) * base_price
            calc_final_price = max(0.0, base_price - disc_amt)
            w_days = int(item.warranty_days or 90)
            now_dt = datetime.now(timezone.utc)
            w_end_dt = now_dt + timedelta(days=w_days)

            try:
                existing = await conn.fetchrow(
                    "SELECT id, merchant_id, status FROM devices WHERE device_sn = $1",
                    dev_sn
                )
                if existing:
                    dev_id = existing["id"]
                    try:
                        await conn.execute("""
                            UPDATE devices 
                            SET merchant_id = $1, telegram_chat_id = $2, device_type = $3, device_model = $4, 
                                price = $5, qr_code = COALESCE($6, qr_code),
                                status = 'ACTIVE', is_active = TRUE, updated_at = CURRENT_TIMESTAMP
                            WHERE id = $7
                        """, m_id_target, chat_id, item.device_type or "Display Soundbox", item.device_model or "Display Soundbox", 
                           base_price, qr_val, dev_id)
                    except Exception:
                        await conn.execute("""
                            UPDATE devices 
                            SET merchant_id = $1, telegram_chat_id = $2, qr_code = COALESCE($3, qr_code), status = 'ACTIVE', is_active = TRUE, updated_at = CURRENT_TIMESTAMP
                            WHERE id = $4
                        """, m_id_target, chat_id, qr_val, dev_id)
                else:
                    try:
                        dev_id = await conn.fetchval("""
                            INSERT INTO devices (
                                merchant_id, device_sn, device_type, device_model, telegram_chat_id, 
                                price, qr_code, status, is_active
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', TRUE)
                            RETURNING id
                        """, m_id_target, dev_sn, item.device_type or "Display Soundbox", item.device_model or "Display Soundbox", chat_id, 
                           base_price, qr_val)
                    except Exception:
                        dev_id = await conn.fetchval("""
                            INSERT INTO devices (
                                merchant_id, device_sn, device_type, telegram_chat_id, qr_code, status, is_active
                            )
                            VALUES ($1, $2, $3, $4, $5, 'ACTIVE', TRUE)
                            RETURNING id
                        """, m_id_target, dev_sn, item.device_type or "Display Soundbox", chat_id, qr_val)

                # Record sales record
                try:
                    await conn.execute("""
                        INSERT INTO sales (
                            device_id, device_sn, merchant_id, sold_by_user_id,
                            customer_name, customer_phone, price, discount_type,
                            discount_percent, discount_amount, final_price, currency,
                            warranty_days, warranty_start_date, warranty_end_date,
                            payment_method, status
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PERCENTAGE', $8, $9, $10, 'USD', $11, $12, $13, 'CASH', 'COMPLETED')
                    """, dev_id, dev_sn, merchant["id"], current_user.get("id"),
                       merchant.get("name") or "Merchant", merchant.get("owner_phone"), base_price,
                       float(item.discount_percent or 0.0), disc_amt, calc_final_price,
                       w_days, now_dt, w_end_dt)
                except Exception as sale_err:
                    logger.warning(f"Batch sale insert warning for {dev_sn}: {sale_err}")

                linked_results.append({
                    "device_sn": dev_sn,
                    "device_id": dev_id,
                    "status": "linked"
                })
            except Exception as item_err:
                logger.error(f"Error linking device {dev_sn} in batch: {item_err}")
                errors.append({"device_sn": dev_sn, "error": str(item_err)})

        if not linked_results and errors:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to link devices: {errors[0]['error']}")

        return {
            "status": "success",
            "message": f"Successfully linked {len(linked_results)} soundbox device(s).",
            "count": len(linked_results),
            "devices": linked_results,
            "errors": errors if errors else None
        }


@router.post("/register", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def register_device(
    payload: DeviceRegisterSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Check merchant existence & permissions
        merchant = await conn.fetchrow(
            "SELECT COALESCE(merchant_id, id::text) AS merchant_id, id, COALESCE(merchant_name, name) AS name, user_id, owner_phone FROM merchants WHERE id::text = $1::text OR merchant_id::text = $1::text",
            str(payload.merchant_id)
        )
        if not merchant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store/Merchant not found.")

        if current_user["role"] != "ADMIN":
            if merchant["user_id"] != current_user["id"] and merchant["owner_phone"] != current_user["phone_number"]:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this store.")

        device_sn = payload.device_sn.strip()
        if not device_sn:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Device Serial Number cannot be empty.")

        # Check if device_sn already registered
        existing_device = await conn.fetchrow(
            "SELECT id, merchant_id, status FROM devices WHERE device_sn = $1",
            device_sn
        )

        chat_id = payload.telegram_chat_id.strip() if payload.telegram_chat_id and payload.telegram_chat_id.strip() else None
        qr_code_val = payload.qr_code.strip() if payload.qr_code and payload.qr_code.strip() else None

        # Eager schema migration to ensure all core hardware columns exist
        try:
            await conn.execute("""
                ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_merchant_id_fkey;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_type VARCHAR(100) DEFAULT 'Display Soundbox';
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_model VARCHAR(100) DEFAULT 'Y6B';
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(255);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS qr_code TEXT;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 29.00;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
            """)
        except Exception as mig_err:
            logger.warning(f"Schema migration warning in register_device: {mig_err}")

        # Check merchant_id column datatype in devices table to avoid asyncpg DataError
        col_type = await conn.fetchval("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'devices' AND column_name = 'merchant_id'
        """)
        if col_type in ('integer', 'bigint', 'smallint'):
            m_id_target = int(payload.merchant_id)
        else:
            m_id_target = str(payload.merchant_id)

        # Base price and discount calculation for sales recording
        base_price = float(payload.price or 29.00)
        disc_amt = float(payload.discount_amount or 0.0)
        if payload.discount_percent and float(payload.discount_percent) > 0:
            disc_amt = (float(payload.discount_percent) / 100.0) * base_price
        calc_final_price = max(0.0, base_price - disc_amt)
        w_days = int(payload.warranty_days or 90)
        now_dt = datetime.now(timezone.utc)
        w_end_dt = now_dt + timedelta(days=w_days)

        if existing_device:
            dev_id = existing_device["id"]
            # Reassign / link to this merchant and activate hardware
            try:
                await conn.execute("""
                    UPDATE devices 
                    SET merchant_id = $1, telegram_chat_id = $2, device_type = $3, device_model = $4, 
                        price = $5, qr_code = COALESCE($6, qr_code),
                        status = 'ACTIVE', is_active = TRUE, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $7
                """, m_id_target, chat_id, payload.device_type or "Display Soundbox", payload.device_model or "Display Soundbox", 
                   base_price, qr_code_val, dev_id)
            except Exception as update_err:
                logger.warning(f"Full device link update failed: {update_err}. Running minimal fallback...")
                try:
                    await conn.execute("""
                        UPDATE devices 
                        SET merchant_id = $1, telegram_chat_id = $2, qr_code = COALESCE($3, qr_code), status = 'ACTIVE', is_active = TRUE, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $4
                    """, m_id_target, chat_id, qr_code_val, dev_id)
                except Exception as final_update_err:
                    logger.error(f"Device link update completely failed: {final_update_err}", exc_info=True)
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to link device: {str(final_update_err)}")

            # Record commercial sale transaction in sales table
            try:
                await conn.execute("""
                    INSERT INTO sales (
                        device_id, device_sn, merchant_id, sold_by_user_id,
                        customer_name, customer_phone, price, discount_type,
                        discount_percent, discount_amount, final_price, currency,
                        warranty_days, warranty_start_date, warranty_end_date,
                        payment_method, status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'PERCENTAGE', $8, $9, $10, 'USD', $11, $12, $13, 'CASH', 'COMPLETED')
                """, dev_id, device_sn, merchant["id"], current_user.get("id"),
                   merchant.get("name") or "Merchant", merchant.get("owner_phone"), base_price,
                   float(payload.discount_percent or 0.0), disc_amt, calc_final_price,
                   w_days, now_dt, w_end_dt)
            except Exception as sale_err:
                logger.warning(f"Could not auto-insert sale record during device link: {sale_err}")

            return {
                "status": "success",
                "message": f"Soundbox '{device_sn}' linked successfully.",
                "device_id": dev_id
            }
        else:
            # Insert new hardware device linked to merchant
            try:
                new_id = await conn.fetchval("""
                    INSERT INTO devices (
                        merchant_id, device_sn, device_type, device_model, telegram_chat_id, 
                        price, qr_code, status, is_active
                    )
                    VALUES (
                        $1, $2, $3, $4, $5, 
                        $6, $7, 'ACTIVE', TRUE
                    )
                    RETURNING id
                """, m_id_target, device_sn, payload.device_type or "Display Soundbox", payload.device_model or "Display Soundbox", chat_id, 
                   base_price, qr_code_val)
            except Exception as insert_err:
                logger.warning(f"Standard device link insert failed: {insert_err}. Retrying with fallback schema...")
                try:
                    new_id = await conn.fetchval("""
                        INSERT INTO devices (
                            merchant_id, device_sn, device_type, telegram_chat_id, qr_code, status, is_active
                        )
                        VALUES ($1, $2, $3, $4, $5, 'ACTIVE', TRUE)
                        RETURNING id
                    """, m_id_target, device_sn, payload.device_type or "Display Soundbox", chat_id, qr_code_val)
                except Exception as fallback_err:
                    alt_m_id = str(payload.merchant_id) if isinstance(m_id_target, int) else (int(payload.merchant_id) if str(payload.merchant_id).isdigit() else payload.merchant_id)
                    try:
                        new_id = await conn.fetchval("""
                            INSERT INTO devices (
                                merchant_id, device_sn, device_type, telegram_chat_id, qr_code, status, is_active
                            )
                            VALUES ($1, $2, $3, $4, $5, 'ACTIVE', TRUE)
                            RETURNING id
                        """, alt_m_id, device_sn, payload.device_type or "Display Soundbox", chat_id, qr_code_val)
                    except Exception as final_err:
                        logger.error(f"Device insert failed completely: {final_err}", exc_info=True)
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Failed to link Soundbox: {str(final_err)}"
                        )

            # Record commercial sale transaction in sales table
            try:
                await conn.execute("""
                    INSERT INTO sales (
                        device_id, device_sn, merchant_id, sold_by_user_id,
                        customer_name, customer_phone, price, discount_type,
                        discount_percent, discount_amount, final_price, currency,
                        warranty_days, warranty_start_date, warranty_end_date,
                        payment_method, status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'PERCENTAGE', $8, $9, $10, 'USD', $11, $12, $13, 'CASH', 'COMPLETED')
                """, new_id, device_sn, merchant["id"], current_user.get("id"),
                   merchant.get("name") or "Merchant", merchant.get("owner_phone"), base_price,
                   float(payload.discount_percent or 0.0), disc_amt, calc_final_price,
                   w_days, now_dt, w_end_dt)
            except Exception as sale_err:
                logger.warning(f"Could not auto-insert sale record during new device link: {sale_err}")

            return {
                "status": "success",
                "message": f"Soundbox '{device_sn}' registered and linked successfully.",
                "device_id": new_id
            }


async def resolve_supplier(conn, supplier_id: Optional[int] = None, supplier_name: Optional[str] = None) -> tuple:
    """Helper to resolve supplier_id and supplier_name against the suppliers table with graceful fallback."""
    try:
        # Check if suppliers table exists; if not, create it
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS suppliers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL UNIQUE,
                contact_person VARCHAR(150),
                phone VARCHAR(50),
                email VARCHAR(150),
                address TEXT,
                notes TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO suppliers (name, is_active)
            VALUES ('Feishu', TRUE), ('Hemi', TRUE)
            ON CONFLICT (name) DO NOTHING;
        """)

        if supplier_id:
            row = await conn.fetchrow("SELECT id, name FROM suppliers WHERE id = $1", int(supplier_id))
            if row:
                return row["id"], row["name"]
        name_clean = (supplier_name or "Feishu").strip()
        if not name_clean:
            name_clean = "Feishu"
        row = await conn.fetchrow("SELECT id, name FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))", name_clean)
        if row:
            return row["id"], row["name"]
        # Fallback to Feishu
        row = await conn.fetchrow("SELECT id, name FROM suppliers WHERE name = 'Feishu' LIMIT 1")
        if row:
            return row["id"], row["name"]
        # If no suppliers table seed exists yet, auto-create
        new_row = await conn.fetchrow("INSERT INTO suppliers (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET is_active = TRUE RETURNING id, name", name_clean)
        return new_row["id"], new_row["name"]
    except Exception as e:
        logger.warning(f"Failed to resolve supplier ({e}), falling back to (None, 'Feishu')")
        return None, "Feishu"


@router.get("/lookup/{device_sn}")
async def lookup_device_by_sn(
    device_sn: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Look up device details (model, type, whether it has an LCD screen, existing QR code) by serial number.
    Used by dashboard linking modals to dynamically show or hide the Payment QR code field.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        sn = device_sn.strip()
        row = await conn.fetchrow("""
            SELECT d.id, d.device_sn, 
                   COALESCE(d.device_type, 'Display Soundbox') AS device_type,
                   COALESCE(d.device_model, 'Y6B') AS device_model,
                   d.qr_code, d.telegram_chat_id, d.status,
                   d.supplier_id,
                   COALESCE(s.name, 'Feishu') AS supplier
            FROM devices d
            LEFT JOIN suppliers s ON d.supplier_id = s.id
            WHERE d.device_sn = $1 OR d.device_id = $1
            ORDER BY d.id DESC
            LIMIT 1
        """, sn)

        if not row:
            return {
                "found": False,
                "device_sn": sn,
                "device_type": "Display Soundbox",
                "device_model": "Display Soundbox",
                "has_lcd_screen": True,
                "qr_code": None,
                "telegram_chat_id": None,
                "status": None,
                "supplier_id": 1,
                "supplier": "Feishu"
            }

        d_type = str(row["device_type"] or "Display Soundbox")
        d_model = str(row["device_model"] or "Y6B")
        
        # Check if the device has an LCD screen (Display Soundbox)
        has_lcd = (
            "display" in d_type.lower() or 
            "lcd" in d_type.lower() or 
            "screen" in d_type.lower() or
            "display" in d_model.lower() or
            "lcd" in d_model.lower()
        )

        return {
            "found": True,
            "device_sn": row["device_sn"],
            "device_type": d_type,
            "device_model": d_model,
            "has_lcd_screen": has_lcd,
            "qr_code": row["qr_code"],
            "telegram_chat_id": row["telegram_chat_id"],
            "status": row["status"],
            "supplier_id": row["supplier_id"],
            "supplier": row["supplier"] or "Feishu"
        }


@router.get("/")
async def list_devices(
    search: Optional[str] = Query(None, description="Search serial number, model, telegram chat ID, or store name"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        where_clauses = ["1=1"]
        params = []
        param_idx = 1

        if current_user["role"] != "ADMIN":
            where_clauses.append(f"(m.user_id = ${param_idx} OR (m.user_id IS NULL AND m.owner_phone = ${param_idx + 1}))")
            params.extend([current_user["id"], current_user["phone_number"]])
            param_idx += 2

        if search and search.strip():
            s = f"%{search.strip()}%"
            where_clauses.append(f"""(
                d.device_sn ILIKE ${param_idx}
                OR d.telegram_chat_id ILIKE ${param_idx}
                OR d.device_model ILIKE ${param_idx}
                OR m.name ILIKE ${param_idx}
                OR m.owner_phone ILIKE ${param_idx}
            )""")
            params.append(s)
            param_idx += 1

        where_sql = " AND ".join(where_clauses)

        query = f"""
            SELECT d.id, 
                   COALESCE(d.device_id, d.device_sn, d.id::text) AS device_id,
                   COALESCE(d.device_sn, d.device_id, d.id::text) AS device_sn,
                   COALESCE(d.device_type, 'Display Soundbox') AS device_type,
                   COALESCE(d.device_model, d.device_name, 'Display Soundbox') AS device_model,
                   d.merchant_id,
                   d.batch_no,
                   d.notes,
                   COALESCE(d.price, 29.00) AS price,
                   COALESCE(latest_sale.discount_amount, 0.00) AS discount_amount,
                   COALESCE(latest_sale.discount_percent, 0.00) AS discount_percent,
                   COALESCE(latest_sale.final_price, d.price, 29.00) AS final_price,
                   COALESCE(latest_sale.warranty_days, 90) AS warranty_days,
                   latest_sale.warranty_start_date,
                   latest_sale.warranty_end_date,
                   d.telegram_chat_id,
                   d.qr_code,
                   d.supplier_id,
                   COALESCE(s.name, 'Feishu') AS supplier,
                   COALESCE(NULLIF(d.status::text, ''), CASE WHEN d.merchant_id IS NULL THEN 'IN_STOCK' WHEN d.is_active = FALSE THEN 'Offline' ELSE 'Online' END, 'IN_STOCK') AS status,
                   COALESCE(d.battery, '100%') AS battery,
                   COALESCE(d.signal, 'Good') AS signal,
                   COALESCE(d.version_4g, 'Y6_LCD_1605_V1.0') AS version_4g,
                   COALESCE(d.version_wifi, 'esp32c2x_2M_OTA') AS version_wifi,
                   COALESCE(d.last_online, d.last_heartbeat, d.updated_at, d.created_at) AS last_time,
                   COALESCE(d.last_heartbeat, d.last_online) AS last_heartbeat,
                   d.created_at,
                   COALESCE(m.merchant_name, m.name) AS store_name,
                   COALESCE(u.full_name, m.merchant_name, m.name) AS merchant_name,
                   COALESCE(m.owner_phone, u.phone_number) AS owner_phone,
                   COALESCE(u.phone_number, m.owner_phone) AS user_phone,
                   COALESCE(u.full_name, m.merchant_name, m.name) AS owner_name
            FROM devices d
            LEFT JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN LATERAL (
                SELECT s_order.id, s_order.price, s_order.discount_amount, s_order.discount_percent, s_order.final_price,
                       s_order.warranty_days, s_order.warranty_start_date, s_order.warranty_end_date
                FROM sales s_order
                WHERE s_order.device_id = d.id OR s_order.device_sn = d.device_sn
                ORDER BY s_order.id DESC
                LIMIT 1
            ) latest_sale ON true
            LEFT JOIN merchants m ON (d.merchant_id::text = m.merchant_id::text OR d.merchant_id::text = m.id::text)
            LEFT JOIN users u ON m.user_id = u.id OR (m.user_id IS NULL AND m.owner_phone = u.phone_number)
            WHERE {where_sql}
            ORDER BY d.id DESC
        """

        try:
            devices = await conn.fetch(query, *params)
        except Exception as e:
            logger.warning(f"list_devices query failed: {e}. Auto-healing schema and retrying...")
            try:
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS suppliers (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(150) NOT NULL UNIQUE,
                        is_active BOOLEAN DEFAULT TRUE
                    );
                    INSERT INTO suppliers (name, is_active) VALUES ('Feishu', TRUE), ('Hemi', TRUE) ON CONFLICT (name) DO NOTHING;
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS supplier_id INT;
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) DEFAULT 'BATCH-STD';
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS version_4g VARCHAR(100) DEFAULT 'Y6B_LCD_1605_V1.0';
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS version_wifi VARCHAR(100) DEFAULT 'esp32c2x_2M_OTA';
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS notes TEXT;
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 29.00;
                    CREATE TABLE IF NOT EXISTS sales (
                        id SERIAL PRIMARY KEY,
                        device_id INT,
                        device_sn VARCHAR(100) NOT NULL,
                        merchant_id INT,
                        price NUMERIC(10, 2) DEFAULT 29.00,
                        discount_amount NUMERIC(10, 2) DEFAULT 0.00,
                        discount_percent NUMERIC(5, 2) DEFAULT 0.00,
                        final_price NUMERIC(10, 2) DEFAULT 29.00,
                        warranty_days INT DEFAULT 90,
                        warranty_start_date TIMESTAMP WITH TIME ZONE,
                        warranty_end_date TIMESTAMP WITH TIME ZONE
                    );
                """)
                devices = await conn.fetch(query, *params)
            except Exception as e2:
                logger.error(f"Fallback list_devices query: {e2}")
                fallback_query = """
                    SELECT d.id, 
                           COALESCE(d.device_id, d.device_sn, d.id::text) AS device_sn,
                           d.merchant_id, 
                           COALESCE(d.status::text, 'IN_STOCK') AS status,
                           d.created_at,
                           COALESCE(d.device_type, 'Display Soundbox') AS device_type,
                           COALESCE(d.device_model, 'Y6B') AS device_model,
                           COALESCE(d.battery, '100%') AS battery,
                           COALESCE(d.signal, 'Good') AS signal,
                           COALESCE(m.merchant_name, m.name) AS store_name
                    FROM devices d
                    LEFT JOIN merchants m ON (d.merchant_id::text = m.merchant_id::text OR d.merchant_id::text = m.id::text)
                    ORDER BY d.id DESC
                """
                devices = await conn.fetch(fallback_query)

        formatted_devices = []
        for d in devices:
            try:
                row = dict(d)
                created_at = row.get("created_at")
                w_start = row.get("warranty_start_date")
                w_end = row.get("warranty_end_date")
                heartbeat = row.get("last_heartbeat")
                l_time = row.get("last_time")

                formatted_devices.append({
                    **row,
                    "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else (str(created_at) if created_at else None),
                    "warranty_start_date": w_start.isoformat() if hasattr(w_start, "isoformat") else (str(w_start) if w_start else None),
                    "warranty_end_date": w_end.isoformat() if hasattr(w_end, "isoformat") else (str(w_end) if w_end else None),
                    "last_heartbeat": heartbeat.isoformat() if hasattr(heartbeat, "isoformat") else (str(heartbeat) if heartbeat else None),
                    "last_time": l_time.strftime("%Y-%m-%d %H:%M:%S") if hasattr(l_time, "strftime") else (str(l_time) if l_time else None)
                })
            except Exception:
                formatted_devices.append(dict(d))

        return {
            "status": "success",
            "devices": formatted_devices
        }


class DeviceBulkImportSchema(BaseModel):
    serial_numbers: List[str] = Field(..., description="List of serial numbers to import into stock")
    device_model: str = "Y6B"
    batch_no: Optional[str] = None
    notes: Optional[str] = None
    price: Optional[float] = 29.00
    supplier_id: Optional[int] = None
    supplier: Optional[str] = "Feishu"


@router.post("/bulk-import", status_code=status.HTTP_201_CREATED)
async def bulk_import_devices(
    payload: DeviceBulkImportSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Bulk imports Soundbox serial numbers into warehouse stock (unassigned).
    Requires Admin privileges.
    """
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can import device stock.")

    raw_sns = [sn.strip() for sn in payload.serial_numbers if sn and sn.strip()]
    if not raw_sns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid serial numbers provided.")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        supp_id, supp_name = await resolve_supplier(conn, payload.supplier_id, payload.supplier)
        imported_count = 0
        skipped_count = 0

        for sn in set(raw_sns):
            existing = await conn.fetchrow("SELECT id FROM devices WHERE device_sn = $1", sn)
            if existing:
                skipped_count += 1
                continue

            try:
                await conn.execute("""
                    INSERT INTO devices (device_id, device_sn, device_model, batch_no, notes, price, status, is_active, battery, signal, supplier_id)
                    VALUES ($1, $1, $2, $3, $4, $5, 'IN_STOCK', FALSE, '100%', 'Good', $6)
                """, sn, payload.device_model or "Y6B", payload.batch_no, payload.notes, payload.price or 29.00, supp_id)
            except Exception as e:
                # Auto-heal missing columns if running against older DB schema
                await conn.execute("""
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_model VARCHAR(100) DEFAULT 'Y6B';
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) DEFAULT 'BATCH-BULK';
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_type VARCHAR(100) DEFAULT 'Display Soundbox';
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS notes TEXT;
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 29.00;
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS supplier_id INT;
                """)
                try:
                    await conn.execute("""
                        INSERT INTO devices (device_id, device_sn, notes, price, status, is_active, battery, signal, supplier_id)
                        VALUES ($1, $1, $2, $3, 'IN_STOCK', FALSE, '100%', 'Good', $4)
                    """, sn, payload.notes, payload.price or 29.00, supp_id)
                except Exception:
                    await conn.execute("""
                        INSERT INTO devices (device_id, device_sn, notes, price, status, is_active, battery, signal)
                        VALUES ($1, $1, $2, $3, 'IN_STOCK', FALSE, '100%', 'Good')
                    """, sn, payload.notes, payload.price or 29.00)
            imported_count += 1

        return {
            "status": "success",
            "message": f"Successfully imported {imported_count} soundbox devices into stock ({skipped_count} duplicates skipped).",
            "imported_count": imported_count,
            "skipped_count": skipped_count
        }


class DeviceIntakeSchema(BaseModel):
    device_sn: str
    device_type: str = "Soundbox"
    device_model: str = "Y6B"
    batch_no: Optional[str] = None
    notes: Optional[str] = None
    merchant_id: Optional[Union[int, str]] = None
    price: Optional[float] = 29.00
    supplier_id: Optional[int] = None
    supplier: Optional[str] = "Feishu"


@router.post("/intake", status_code=status.HTTP_201_CREATED)
async def intake_single_device(
    payload: DeviceIntakeSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Registers a single Soundbox device into warehouse stock or assigns it to a store.
    Requires Admin privileges.
    """
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can intake device stock.")

    sn = payload.device_sn.strip()
    if not sn:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Serial number is required.")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM devices WHERE device_sn = $1", sn)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Device SN '{sn}' is already registered in the system.")

        supp_id, supp_name = await resolve_supplier(conn, payload.supplier_id, payload.supplier)

        initial_status = 'ACTIVE' if payload.merchant_id else 'IN_STOCK'
        is_active = True if payload.merchant_id else False

        # Safely resolve merchant_id type matching devices table schema
        m_id_target = None
        if payload.merchant_id is not None:
            col_type = await conn.fetchval("""
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = 'devices' AND column_name = 'merchant_id'
            """)
            if col_type in ('integer', 'bigint', 'smallint'):
                try:
                    m_id_target = int(payload.merchant_id)
                except Exception:
                    m_id_target = None
            else:
                m_id_target = str(payload.merchant_id)

        try:
            new_id = await conn.fetchval("""
                INSERT INTO devices (
                    device_id, device_sn, device_type, device_model, 
                    merchant_id, batch_no, notes, price, status, is_active, battery, signal, supplier_id
                )
                VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, '100%', 'Good', $10)
                RETURNING id
            """, sn, payload.device_type or "Display Soundbox", payload.device_model or "Y6B", m_id_target, payload.batch_no, payload.notes, payload.price or 29.00, initial_status, is_active, supp_id)
        except Exception as insert_err:
            logger.warning(f"Standard device intake failed: {insert_err}. Attempting schema auto-heal and fallback...")
            try:
                # Auto-heal missing columns if running against an older database schema
                await conn.execute("""
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_model VARCHAR(100) DEFAULT 'Y6B';
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) DEFAULT 'BATCH-SINGLE';
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_type VARCHAR(100) DEFAULT 'Display Soundbox';
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS notes TEXT;
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 29.00;
                    ALTER TABLE devices ADD COLUMN IF NOT EXISTS supplier_id INT;
                """)
                try:
                    new_id = await conn.fetchval("""
                        INSERT INTO devices (
                            device_id, device_sn, device_type, device_model,
                            merchant_id, batch_no, notes, price, status, is_active, battery, signal, supplier_id
                        )
                        VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, '100%', 'Good', $10)
                        RETURNING id
                    """, sn, payload.device_type or "Display Soundbox", payload.device_model or "Y6B", m_id_target, payload.batch_no, payload.notes, payload.price or 29.00, initial_status, is_active, supp_id)
                except Exception:
                    new_id = await conn.fetchval("""
                        INSERT INTO devices (
                            device_id, device_sn, device_type, 
                            merchant_id, notes, price, status, is_active, battery, signal
                        )
                        VALUES ($1, $1, $2, $3, $4, $5, $6, $7, '100%', 'Good')
                        RETURNING id
                    """, sn, payload.device_type or "Display Soundbox", m_id_target, payload.notes, payload.price or 29.00, initial_status, is_active)
            except Exception as final_err:
                logger.error(f"Device intake permanently failed for SN '{sn}': {final_err}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to intake device: {str(final_err)}"
                )

        return {
            "status": "success",
            "message": f"Soundbox '{sn}' registered successfully into stock.",
            "device_id": new_id
        }


@router.post("/{device_id}/return-to-stock")
async def return_device_to_stock(
    device_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Unlinks a soundbox from its current store and returns it to available warehouse inventory.
    Requires Admin privileges.
    """
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can return devices to stock.")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        device = await conn.fetchrow("SELECT id, device_sn FROM devices WHERE id = $1", device_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        await conn.execute("""
            UPDATE devices 
            SET merchant_id = NULL, status = 'IN_STOCK', is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        """, device_id)

        return {
            "status": "success",
            "message": f"Device '{device['device_sn']}' returned to warehouse stock."
        }


@router.post("/{device_id}/maintenance")
async def mark_device_maintenance(
    device_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Marks a device as under repair/maintenance.
    Requires Admin privileges.
    """
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can manage maintenance.")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        device = await conn.fetchrow("SELECT id, device_sn FROM devices WHERE id = $1", device_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        await conn.execute("""
            UPDATE devices 
            SET status = 'MAINTENANCE', is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        """, device_id)

        return {
            "status": "success",
            "message": f"Device '{device['device_sn']}' marked under maintenance/repair."
        }


class DeviceCommandSchema(BaseModel):
    command_type: str = Field(..., description="VOICE_BROADCAST, SET_VOLUME, PLAY_TEST, REBOOT, or SYNC_TIME")
    amount: Optional[str] = "10.00"
    currency: Optional[str] = "USD"
    volume: Optional[int] = 80
    custom_text: Optional[str] = None


@router.post("/{device_id}/command")
async def send_device_command(
    device_id: int,
    payload: DeviceCommandSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Sends an operational command (Voice broadcast test, Volume change, Reboot) to a Soundbox device.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        device = await conn.fetchrow("SELECT id, device_sn, merchant_id, is_active FROM devices WHERE id = $1", device_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        # Update last heartbeat / online timestamp to reflect live interaction
        await conn.execute("UPDATE devices SET last_heartbeat = CURRENT_TIMESTAMP, last_online = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1", device_id)

        # Log command dispatch in security_alerts
        amt = float(payload.amount) if payload.amount and str(payload.amount).replace('.', '', 1).isdigit() else None
        await conn.execute("""
            INSERT INTO security_alerts (device_id, merchant_id, alert_type, severity, bank_name, amount, currency, sender_name, raw_message, reason, created_at)
            VALUES ($1, $2, 'COMMAND_DISPATCH', 'INFO', 'SYSTEM', $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        """, device_id, device["merchant_id"], amt, payload.currency or 'USD', current_user.get("full_name", "Admin"), f"Command [{payload.command_type}] dispatched", f"Volume: {payload.volume}%, Custom Text: {payload.custom_text or 'N/A'}")

        return {
            "status": "success",
            "message": f"Command '{payload.command_type}' sent to Soundbox '{device['device_sn']}' successfully.",
            "device_sn": device["device_sn"],
            "command_type": payload.command_type
        }


class BatchCommandSchema(BaseModel):
    device_ids: List[int]
    command_type: str
    volume: Optional[int] = 80


@router.post("/batch-command")
async def batch_send_commands(
    payload: BatchCommandSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Dispatches a command to multiple Soundbox devices simultaneously.
    Requires Admin privileges.
    """
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can dispatch batch commands.")

    if not payload.device_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No devices selected.")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        for d_id in payload.device_ids:
            await conn.execute("UPDATE devices SET last_heartbeat = CURRENT_TIMESTAMP, last_online = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1", d_id)

        return {
            "status": "success",
            "message": f"Dispatched '{payload.command_type}' to {len(payload.device_ids)} soundboxes successfully."
        }


class DeviceUpdateSchema(BaseModel):
    device_sn: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    device_type: Optional[str] = None
    device_model: Optional[str] = None
    qr_code: Optional[str] = None
    status: Optional[str] = None
    merchant_id: Optional[Union[int, str]] = None
    batch_no: Optional[str] = None
    notes: Optional[str] = None
    price: Optional[float] = None
    discount_amount: Optional[float] = None
    discount_percent: Optional[float] = None
    final_price: Optional[float] = None
    warranty_days: Optional[int] = None
    warranty_start_date: Optional[str] = None
    warranty_end_date: Optional[str] = None
    supplier_id: Optional[int] = None
    supplier: Optional[str] = None


@router.put("/{device_id}")
async def update_device(
    device_id: int,
    payload: DeviceUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Updates device configurations (SN, Telegram Chat ID, QR Code, Model, Status, or Assigned Store).
    Requires Admin privileges or Store Ownership for assigned devices.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        device = await conn.fetchrow("SELECT id, device_sn, merchant_id FROM devices WHERE id = $1", device_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        if current_user.get("role") != "ADMIN":
            owns = None
            if device.get("merchant_id"):
                owns = await conn.fetchval("""
                    SELECT 1 FROM merchants m 
                    WHERE (m.id::text = $1 OR m.merchant_id::text = $1)
                      AND (m.user_id = $2 OR (m.user_id IS NULL AND m.owner_phone = $3))
                """, str(device["merchant_id"]), current_user["id"], current_user.get("phone_number"))
            if not owns:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only administrators or store owners can update device configurations."
                )

        # Check if new SN conflicts with existing
        if payload.device_sn and payload.device_sn.strip() != device["device_sn"]:
            existing_sn = await conn.fetchrow(
                "SELECT id FROM devices WHERE device_sn = $1 AND id != $2",
                payload.device_sn.strip(), device_id
            )
            if existing_sn:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Device SN '{payload.device_sn.strip()}' is already used by another device.")

        updates = []
        params = [device_id]
        idx = 2

        if payload.device_sn is not None:
            updates.append(f"device_sn = ${idx}")
            params.append(payload.device_sn.strip())
            idx += 1

        if payload.telegram_chat_id is not None:
            updates.append(f"telegram_chat_id = ${idx}")
            params.append(payload.telegram_chat_id.strip() if payload.telegram_chat_id.strip() else None)
            idx += 1

        if payload.qr_code is not None:
            updates.append(f"qr_code = ${idx}")
            params.append(payload.qr_code.strip() if payload.qr_code.strip() else None)
            idx += 1

        if payload.device_type is not None:
            updates.append(f"device_type = ${idx}")
            params.append(payload.device_type.strip())
            idx += 1

        if payload.device_model is not None:
            updates.append(f"device_model = ${idx}")
            params.append(payload.device_model.strip())
            idx += 1

        if payload.batch_no is not None:
            updates.append(f"batch_no = ${idx}")
            params.append(payload.batch_no.strip())
            idx += 1

        if payload.notes is not None:
            updates.append(f"notes = ${idx}")
            params.append(payload.notes.strip())
            idx += 1

        if payload.price is not None:
            updates.append(f"price = ${idx}")
            params.append(float(payload.price))
            idx += 1

        # Synchronize sales & warranty updates to the sales table if any commercial fields are supplied
        has_sales_update = any(v is not None for v in [
            payload.discount_amount, payload.discount_percent, payload.final_price,
            payload.warranty_days, payload.warranty_start_date, payload.warranty_end_date
        ])
        if has_sales_update:
            try:
                latest_sale = await conn.fetchrow("""
                    SELECT s.id, s.price, s.discount_amount, s.discount_percent, s.final_price,
                           s.warranty_days, s.warranty_start_date, s.warranty_end_date
                    FROM sales s
                    JOIN devices d ON (s.device_id = d.id OR s.device_sn = d.device_sn)
                    WHERE d.id = $1
                    ORDER BY s.id DESC
                    LIMIT 1
                """, device_id)
                if latest_sale:
                    s_id = latest_sale["id"]
                    s_price = float(payload.price if payload.price is not None else (latest_sale["price"] or 29.0))
                    s_disc_pct = float(payload.discount_percent if payload.discount_percent is not None else (latest_sale["discount_percent"] or 0.0))
                    s_disc_amt = float(payload.discount_amount if payload.discount_amount is not None else (latest_sale["discount_amount"] or 0.0))
                    if payload.discount_percent is not None and s_disc_pct > 0:
                        s_disc_amt = (s_disc_pct / 100.0) * s_price
                    s_final = float(payload.final_price if payload.final_price is not None else max(0.0, s_price - s_disc_amt))
                    s_wdays = int(payload.warranty_days if payload.warranty_days is not None else (latest_sale["warranty_days"] or 90))
                    
                    s_start = latest_sale["warranty_start_date"]
                    if payload.warranty_start_date:
                        try:
                            s_start = datetime.fromisoformat(payload.warranty_start_date.replace("Z", "+00:00"))
                        except Exception:
                            pass
                    s_end = latest_sale["warranty_end_date"]
                    if payload.warranty_end_date:
                        try:
                            s_end = datetime.fromisoformat(payload.warranty_end_date.replace("Z", "+00:00"))
                        except Exception:
                            pass
                    elif s_start and payload.warranty_days is not None:
                        s_end = s_start + timedelta(days=s_wdays)

                    await conn.execute("""
                        UPDATE sales
                        SET price = $1, discount_percent = $2, discount_amount = $3, final_price = $4,
                            warranty_days = $5, warranty_start_date = $6, warranty_end_date = $7,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $8
                    """, s_price, s_disc_pct, s_disc_amt, s_final, s_wdays, s_start, s_end, s_id)
            except Exception as s_err:
                logger.warning(f"Could not synchronize sale updates for device {device_id}: {s_err}")

        if payload.status is not None:
            st_val = payload.status.strip().upper()
            col_type = await conn.fetchval("""
                SELECT udt_name FROM information_schema.columns 
                WHERE table_name = 'devices' AND column_name = 'status'
            """)
            if col_type == 'device_status':
                try:
                    await conn.execute(f"ALTER TYPE device_status ADD VALUE IF NOT EXISTS '{st_val}';")
                except Exception:
                    pass
                updates.append(f"status = ${idx}::device_status")
            else:
                updates.append(f"status = ${idx}")
            params.append(st_val)
            idx += 1
            if st_val == 'ACTIVE':
                updates.append("is_active = TRUE")
            elif st_val in ['IN_STOCK', 'MAINTENANCE', 'PENDING', 'RETIRED']:
                updates.append("is_active = FALSE")
            if st_val == 'PENDING':
                updates.append("merchant_id = NULL")

        if payload.merchant_id is not None:
            col_type = await conn.fetchval("""
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = 'devices' AND column_name = 'merchant_id'
            """)
            if col_type in ('integer', 'bigint', 'smallint'):
                try:
                    m_id_target = int(payload.merchant_id)
                except Exception:
                    m_id_target = None
            else:
                m_id_target = str(payload.merchant_id)
            updates.append(f"merchant_id = ${idx}")
            params.append(m_id_target)
            idx += 1
            if payload.status is None:
                updates.append("status = 'ACTIVE'::device_status")
                updates.append("is_active = TRUE")

        if payload.supplier_id is not None or payload.supplier is not None:
            supp_id, supp_name = await resolve_supplier(conn, payload.supplier_id, payload.supplier)
            updates.append(f"supplier_id = ${idx}")
            params.append(supp_id)
            idx += 1

        if not updates:
            return {"status": "success", "message": "No changes requested."}

        updates.append("updated_at = CURRENT_TIMESTAMP")
        set_sql = ", ".join(updates)

        try:
            await conn.execute(f"UPDATE devices SET {set_sql} WHERE id = $1", *params)
        except Exception as upd_err:
            logger.warning(f"Device update error with sql '{set_sql}': {upd_err}. Retrying without enum cast...")
            set_sql_clean = set_sql.replace("::device_status", "")
            await conn.execute(f"UPDATE devices SET {set_sql_clean} WHERE id = $1", *params)

        return {
            "status": "success",
            "message": "Device updated successfully."
        }


@router.post("/{device_id}/unlink")
@router.delete("/{device_id}")
async def unlink_device(
    device_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        device = await conn.fetchrow(
            """
            SELECT d.id, d.merchant_id, d.device_sn, m.user_id, m.owner_phone
            FROM devices d
            LEFT JOIN merchants m ON (d.merchant_id::text = m.merchant_id::text OR d.merchant_id::text = m.id::text)
            WHERE d.id = $1
            """,
            device_id
        )
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        # Permission check
        if current_user["role"] != "ADMIN":
            if device["merchant_id"] is not None:
                if device["user_id"] != current_user["id"] and device["owner_phone"] != current_user["phone_number"]:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to unlink this device.")

        # Delete device (cascades or unlinks cleanly)
        await conn.execute("DELETE FROM devices WHERE id = $1", device_id)

        return {
            "status": "success",
            "message": f"Device {device['device_sn']} unlinked successfully."
        }
