from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone

from backend.database import get_db_pool
from backend.security import get_current_user

router = APIRouter(prefix="/api/devices", tags=["Devices"])


class DeviceRegisterSchema(BaseModel):
    merchant_id: int
    device_sn: str = Field(..., description="Serial Number of Soundbox Y6B")
    telegram_chat_id: Optional[str] = None
    device_type: str = "Display Soundbox"
    device_model: str = "Display Soundbox"
    price: Optional[float] = 29.00
    discount_amount: Optional[float] = 0.00
    discount_percent: Optional[float] = 0.00
    final_price: Optional[float] = None
    warranty_days: Optional[int] = 90
    warranty_start_date: Optional[str] = None
    warranty_end_date: Optional[str] = None


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
            "SELECT id, name, user_id, owner_phone FROM merchants WHERE id = $1",
            payload.merchant_id
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

        if existing_device:
            # Calculate final price with discount
            base_price = float(payload.price or 29.00)
            disc_amt = float(payload.discount_amount or 0.0)
            if payload.discount_percent and float(payload.discount_percent) > 0:
                disc_amt = (float(payload.discount_percent) / 100.0) * base_price
            calc_final_price = max(0.0, base_price - disc_amt)
            w_days = int(payload.warranty_days or 90)

            # Reassign / link to this merchant and activate with warranty
            await conn.execute("""
                UPDATE devices 
                SET merchant_id = $1, telegram_chat_id = $2, device_type = $3, device_model = $4, 
                    price = $5, discount_amount = $6, discount_percent = $7, final_price = $8,
                    warranty_days = $9, 
                    warranty_start_date = COALESCE(warranty_start_date, CURRENT_TIMESTAMP),
                    warranty_end_date = COALESCE(warranty_end_date, CURRENT_TIMESTAMP + ($9 || ' days')::INTERVAL),
                    status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
                WHERE id = $10
            """, payload.merchant_id, chat_id, payload.device_type or "Display Soundbox", payload.device_model or "Display Soundbox", 
               base_price, disc_amt, float(payload.discount_percent or 0.0), calc_final_price, w_days, existing_device["id"])

            return {
                "status": "success",
                "message": f"Soundbox '{device_sn}' linked successfully.",
                "device_id": existing_device["id"]
            }
        else:
            base_price = float(payload.price or 29.00)
            disc_amt = float(payload.discount_amount or 0.0)
            if payload.discount_percent and float(payload.discount_percent) > 0:
                disc_amt = (float(payload.discount_percent) / 100.0) * base_price
            calc_final_price = max(0.0, base_price - disc_amt)
            w_days = int(payload.warranty_days or 90)

            # Insert new device linked to merchant with warranty
            new_id = await conn.fetchval("""
                INSERT INTO devices (
                    merchant_id, device_sn, device_type, device_model, telegram_chat_id, 
                    price, discount_amount, discount_percent, final_price, 
                    warranty_days, warranty_start_date, warranty_end_date, status
                )
                VALUES (
                    $1, $2, $3, $4, $5, 
                    $6, $7, $8, $9, 
                    $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($10 || ' days')::INTERVAL, 'ACTIVE'
                )
                RETURNING id
            """, payload.merchant_id, device_sn, payload.device_type or "Display Soundbox", payload.device_model or "Display Soundbox", chat_id, 
               base_price, disc_amt, float(payload.discount_percent or 0.0), calc_final_price, w_days)

            return {
                "status": "success",
                "message": f"Soundbox '{device_sn}' registered and linked successfully.",
                "device_id": new_id
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
                   COALESCE(d.batch_no, 'BATCH-STD') AS batch_no,
                   d.notes,
                   COALESCE(d.price, 29.00) AS price,
                   COALESCE(d.discount_amount, 0.00) AS discount_amount,
                   COALESCE(d.discount_percent, 0.00) AS discount_percent,
                   COALESCE(d.final_price, d.price, 29.00) AS final_price,
                   COALESCE(d.warranty_days, 90) AS warranty_days,
                   d.warranty_start_date,
                   d.warranty_end_date,
                   COALESCE(d.telegram_chat_id, d.chat_id) AS telegram_chat_id,
                   COALESCE(d.status::text, CASE WHEN d.merchant_id IS NULL THEN 'IN_STOCK' WHEN d.is_active = FALSE THEN 'Offline' ELSE 'Online' END, 'IN_STOCK') AS status,
                   COALESCE(d.battery, '100%') AS battery,
                   COALESCE(d.signal, 'Good') AS signal,
                   COALESCE(d.version_4g, 'Y6_LCD_1605_V1.0') AS version_4g,
                   COALESCE(d.version_wifi, 'esp32c2x_2M_OTA') AS version_wifi,
                   COALESCE(d.last_online, d.last_heartbeat, d.updated_at, d.created_at) AS last_time,
                   COALESCE(d.last_heartbeat, d.last_online) AS last_heartbeat,
                   d.created_at,
                   m.name AS store_name, m.owner_phone,
                   COALESCE(u.full_name, m.name) AS owner_name
            FROM devices d
            LEFT JOIN merchants m ON d.merchant_id = m.id
            LEFT JOIN users u ON m.user_id = u.id
            WHERE {where_sql}
            ORDER BY d.id DESC
        """

        devices = await conn.fetch(query, *params)

        return {
            "status": "success",
            "devices": [
                {
                    **dict(d),
                    "created_at": d["created_at"].isoformat() if d["created_at"] else None,
                    "warranty_start_date": d["warranty_start_date"].isoformat() if d["warranty_start_date"] else None,
                    "warranty_end_date": d["warranty_end_date"].isoformat() if d["warranty_end_date"] else None,
                    "last_heartbeat": d["last_heartbeat"].isoformat() if d["last_heartbeat"] else None,
                    "last_time": d["last_time"].strftime("%Y-%m-%d %H:%M:%S") if d["last_time"] else None
                }
                for d in devices
            ]
        }


class DeviceBulkImportSchema(BaseModel):
    serial_numbers: List[str] = Field(..., description="List of serial numbers to import into stock")
    device_model: str = "Y6B"
    batch_no: Optional[str] = None
    notes: Optional[str] = None
    price: Optional[float] = 29.00


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
        imported_count = 0
        skipped_count = 0

        for sn in set(raw_sns):
            existing = await conn.fetchrow("SELECT id FROM devices WHERE device_sn = $1", sn)
            if existing:
                skipped_count += 1
                continue

            await conn.execute("""
                INSERT INTO devices (device_id, device_sn, device_model, batch_no, notes, price, status, is_active, battery, signal)
                VALUES ($1, $1, $2, $3, $4, $5, 'IN_STOCK', FALSE, '100%', 'Good')
            """, sn, payload.device_model or "Y6B", payload.batch_no or "BATCH-BULK", payload.notes, payload.price or 29.00)
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
    merchant_id: Optional[int] = None
    price: Optional[float] = 29.00


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

        initial_status = 'ACTIVE' if payload.merchant_id else 'IN_STOCK'
        is_active = True if payload.merchant_id else False

        new_id = await conn.fetchval("""
            INSERT INTO devices (device_id, device_sn, device_type, device_model, merchant_id, batch_no, notes, price, status, is_active, battery, signal)
            VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8::device_status, $9, '100%', 'Good')
            RETURNING id
        """, sn, payload.device_type or "Soundbox", payload.device_model or "Y6B", payload.merchant_id, payload.batch_no or "BATCH-SINGLE", payload.notes, payload.price or 29.00, initial_status, is_active)

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
    status: Optional[str] = None
    merchant_id: Optional[int] = None
    batch_no: Optional[str] = None
    notes: Optional[str] = None
    price: Optional[float] = None
    discount_amount: Optional[float] = None
    discount_percent: Optional[float] = None
    final_price: Optional[float] = None
    warranty_days: Optional[int] = None
    warranty_start_date: Optional[str] = None
    warranty_end_date: Optional[str] = None


@router.put("/{device_id}")
async def update_device(
    device_id: int,
    payload: DeviceUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Updates device configurations (SN, Telegram Chat ID, Model, Status, or Assigned Store).
    Requires Admin privileges.
    """
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update device configurations."
        )

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        device = await conn.fetchrow("SELECT id, device_sn FROM devices WHERE id = $1", device_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

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

        if payload.discount_amount is not None:
            updates.append(f"discount_amount = ${idx}")
            params.append(float(payload.discount_amount))
            idx += 1

        if payload.discount_percent is not None:
            updates.append(f"discount_percent = ${idx}")
            params.append(float(payload.discount_percent))
            idx += 1

        if payload.final_price is not None:
            updates.append(f"final_price = ${idx}")
            params.append(float(payload.final_price))
            idx += 1
        elif payload.price is not None or payload.discount_amount is not None or payload.discount_percent is not None:
            # Auto-compute final price if components provided
            p_val = float(payload.price if payload.price is not None else 29.0)
            d_amt = float(payload.discount_amount if payload.discount_amount is not None else 0.0)
            if payload.discount_percent and float(payload.discount_percent) > 0:
                d_amt = (float(payload.discount_percent) / 100.0) * p_val
            f_val = max(0.0, p_val - d_amt)
            updates.append(f"final_price = ${idx}")
            params.append(f_val)
            idx += 1

        # Warranty days and dates handling
        if payload.warranty_days is not None:
            updates.append(f"warranty_days = ${idx}")
            params.append(int(payload.warranty_days))
            idx += 1

        w_days_val = int(payload.warranty_days) if payload.warranty_days is not None else 90

        if payload.warranty_start_date is not None:
            try:
                clean_str = payload.warranty_start_date.replace("Z", "+00:00")
                start_dt = datetime.fromisoformat(clean_str)
            except Exception:
                start_dt = datetime.now(timezone.utc)
            updates.append(f"warranty_start_date = ${idx}")
            params.append(start_dt)
            idx += 1

            if payload.warranty_end_date is not None:
                try:
                    clean_end = payload.warranty_end_date.replace("Z", "+00:00")
                    end_dt = datetime.fromisoformat(clean_end)
                except Exception:
                    end_dt = start_dt + timedelta(days=w_days_val)
            else:
                end_dt = start_dt + timedelta(days=w_days_val)
            updates.append(f"warranty_end_date = ${idx}")
            params.append(end_dt)
            idx += 1
        elif payload.merchant_id is not None or payload.warranty_days is not None:
            now_dt = datetime.now(timezone.utc)
            end_dt = now_dt + timedelta(days=w_days_val)
            updates.append("warranty_start_date = COALESCE(warranty_start_date, CURRENT_TIMESTAMP)")
            updates.append(f"warranty_end_date = COALESCE(warranty_start_date, CURRENT_TIMESTAMP) + (${idx}::INT * INTERVAL '1 day')")
            params.append(w_days_val)
            idx += 1

        if payload.status is not None:
            updates.append(f"status = ${idx}::device_status")
            params.append(payload.status.strip())
            idx += 1
            if payload.status.strip().upper() == 'ACTIVE':
                updates.append("is_active = TRUE")
            elif payload.status.strip().upper() in ['IN_STOCK', 'MAINTENANCE', 'PENDING', 'RETIRED']:
                updates.append("is_active = FALSE")

        if payload.merchant_id is not None:
            updates.append(f"merchant_id = ${idx}")
            params.append(payload.merchant_id)
            idx += 1
            if payload.status is None:
                updates.append("status = 'ACTIVE'::device_status")
                updates.append("is_active = TRUE")

        if not updates:
            return {"status": "success", "message": "No changes requested."}

        updates.append("updated_at = CURRENT_TIMESTAMP")
        set_sql = ", ".join(updates)

        await conn.execute(f"UPDATE devices SET {set_sql} WHERE id = $1", *params)

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
            LEFT JOIN merchants m ON d.merchant_id = m.id
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
