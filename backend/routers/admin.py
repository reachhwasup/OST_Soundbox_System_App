from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import json

from backend.database import get_db_pool
from backend.security import require_admin, hash_password, normalize_phone_number

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])


# --- Pydantic Schemas for Admin Operations ---

class AdminCreateUserSchema(BaseModel):
    phone_number: str = Field(..., min_length=8, max_length=20, description="Unique phone number")
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=6, description="Initial password")
    role: str = Field("USER", description="ADMIN or USER")
    status: str = Field("ACTIVE", description="ACTIVE, PENDING, or SUSPENDED")


class AdminUpdateUserSchema(BaseModel):
    phone_number: Optional[str] = Field(None, min_length=8, max_length=20)
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    role: Optional[str] = None
    status: Optional[str] = None


class AdminResetPasswordSchema(BaseModel):
    new_password: str = Field(..., min_length=6, description="New password for user")


class AdminStatusToggleSchema(BaseModel):
    status: str = Field(..., description="ACTIVE or SUSPENDED")


# --- Admin Endpoints ---

@router.get("/stats")
async def get_system_stats():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
        active_users = await conn.fetchval("SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'")
        suspended_users = await conn.fetchval("SELECT COUNT(*) FROM users WHERE status = 'SUSPENDED'")
        admin_count = await conn.fetchval("SELECT COUNT(*) FROM users WHERE role = 'ADMIN'")
        total_stores = await conn.fetchval("SELECT COUNT(*) FROM merchants")
        total_devices = await conn.fetchval("SELECT COUNT(*) FROM devices")
        total_transactions = await conn.fetchval("SELECT COUNT(*) FROM transactions")

        return {
            "status": "success",
            "stats": {
                "total_users": total_users,
                "active_users": active_users,
                "suspended_users": suspended_users,
                "admin_count": admin_count,
                "total_stores": total_stores,
                "total_devices": total_devices,
                "total_transactions": total_transactions
            }
        }


@router.get("/users")
async def list_users(
    search: Optional[str] = Query(None, description="Search phone, name, store name, place, or location"),
    role: Optional[str] = Query(None, description="Filter by role (ADMIN, USER)"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, SUSPENDED)"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    pool = await get_db_pool()
    offset = (page - 1) * limit
    
    where_clauses = ["1=1"]
    params = []
    param_idx = 1

    if search and search.strip():
        s = f"%{search.strip()}%"
        where_clauses.append(f"""(
            u.phone_number ILIKE ${param_idx} 
            OR u.full_name ILIKE ${param_idx}
            OR EXISTS (
                SELECT 1 FROM merchants m 
                WHERE (m.user_id = u.id OR (m.user_id IS NULL AND m.owner_phone = u.phone_number))
                AND (m.name ILIKE ${param_idx} OR m.place ILIKE ${param_idx} OR m.location ILIKE ${param_idx})
            )
        )""")
        params.append(s)
        param_idx += 1

    if role and role.strip() and role.strip().upper() in ["ADMIN", "USER"]:
        where_clauses.append(f"u.role = ${param_idx}")
        params.append(role.strip().upper())
        param_idx += 1

    if status and status.strip() and status.strip().upper() in ["ACTIVE", "PENDING", "SUSPENDED"]:
        where_clauses.append(f"u.status = ${param_idx}")
        params.append(status.strip().upper())
        param_idx += 1

    where_sql = " AND ".join(where_clauses)

    count_query = f"SELECT COUNT(*) FROM users u WHERE {where_sql}"
    
    query = f"""
        SELECT 
            u.id, u.phone_number, u.full_name, u.role, u.status, 
            u.last_login_at, u.created_at, u.updated_at,
            COALESCE(
                (
                    SELECT json_agg(json_build_object(
                        'id', m.id,
                        'name', m.name,
                        'place', m.place,
                        'location', m.location
                    ))
                    FROM merchants m
                    WHERE m.user_id = u.id OR (m.user_id IS NULL AND m.owner_phone = u.phone_number)
                ),
                '[]'::json
            ) AS stores
        FROM users u
        WHERE {where_sql}
        ORDER BY u.id DESC 
        LIMIT ${param_idx} OFFSET ${param_idx + 1}
    """
    params.extend([limit, offset])

    async with pool.acquire() as conn:
        total_count = await conn.fetchval(count_query, *params[:-2])
        rows = await conn.fetch(query, *params)

        users = []
        for r in rows:
            stores_data = r["stores"]
            if isinstance(stores_data, str):
                stores_data = json.loads(stores_data)
            elif stores_data is None:
                stores_data = []

            primary_store = stores_data[0] if len(stores_data) > 0 else None

            users.append({
                "id": r["id"],
                "phone_number": r["phone_number"],
                "full_name": r["full_name"],
                "role": r["role"],
                "status": r["status"],
                "last_login_at": r["last_login_at"].isoformat() if r["last_login_at"] else None,
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
                "store_count": len(stores_data),
                "stores": stores_data,
                "store": primary_store
            })

        return {
            "status": "success",
            "total": total_count,
            "page": page,
            "limit": limit,
            "users": users
        }


@router.post("/users")
async def create_user(payload: AdminCreateUserSchema):
    pool = await get_db_pool()
    clean_phone = normalize_phone_number(payload.phone_number)
    
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM users WHERE phone_number = $1", clean_phone)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this phone number already exists."
            )

        hashed = hash_password(payload.password)
        new_id = await conn.fetchval(
            """
            INSERT INTO users (phone_number, full_name, password_hash, role, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            """,
            clean_phone, payload.full_name.strip(), hashed, payload.role.upper(), payload.status.upper()
        )

        return {
            "status": "success",
            "message": f"User '{payload.full_name}' created successfully.",
            "user_id": new_id
        }


@router.put("/users/{user_id}")
async def update_user(
    user_id: int, 
    payload: AdminUpdateUserSchema,
    current_admin: Dict[str, Any] = Depends(require_admin)
):
    if user_id == current_admin["id"]:
        if payload.status and payload.status.upper() != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot suspend your own admin account."
            )
        if payload.role and payload.role.upper() != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot remove your own admin privileges."
            )

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT id, phone_number FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        # Check phone conflict
        clean_phone = normalize_phone_number(payload.phone_number) if payload.phone_number else None
        if clean_phone and clean_phone != user["phone_number"]:
            conflict = await conn.fetchrow(
                "SELECT id FROM users WHERE phone_number = $1 AND id != $2",
                clean_phone, user_id
            )
            if conflict:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is already in use by another user.")

        updates = []
        params = []
        idx = 1

        if clean_phone is not None:
            updates.append(f"phone_number = ${idx}")
            params.append(clean_phone)
            idx += 1

        if payload.full_name is not None:
            updates.append(f"full_name = ${idx}")
            params.append(payload.full_name.strip())
            idx += 1

        if payload.role is not None:
            updates.append(f"role = ${idx}")
            params.append(payload.role.upper())
            idx += 1

        if payload.status is not None:
            updates.append(f"status = ${idx}")
            params.append(payload.status.upper())
            idx += 1

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            set_clause = ", ".join(updates)
            params.append(user_id)
            query = f"UPDATE users SET {set_clause} WHERE id = ${idx}"
            await conn.execute(query, *params)

        return {
            "status": "success",
            "message": "User updated successfully."
        }


@router.patch("/users/{user_id}/status")
async def toggle_user_status(
    user_id: int, 
    payload: AdminStatusToggleSchema,
    current_admin: Dict[str, Any] = Depends(require_admin)
):
    if user_id == current_admin["id"] and payload.status.upper() != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot suspend your own admin account while logged in."
        )

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT id, phone_number, role FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        await conn.execute(
            "UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            payload.status.upper(), user_id
        )

        return {
            "status": "success",
            "message": f"User status updated to {payload.status.upper()}."
        }


@router.patch("/users/{user_id}/reset-password")
async def reset_user_password(user_id: int, payload: AdminResetPasswordSchema):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        hashed = hash_password(payload.new_password)
        await conn.execute(
            "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            hashed, user_id
        )

        return {
            "status": "success",
            "message": "User password reset successfully."
        }


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, current_admin: Dict[str, Any] = Depends(require_admin)):
    if user_id == current_admin["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account while logged in."
        )

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT id, full_name, phone_number FROM users WHERE id = $1", user_id)
        if not user:
            # Idempotent deletion: if user already deleted from DB, return success
            return {
                "status": "success",
                "message": "User was already removed or does not exist."
            }

        # Safe unlinking of associated stores so foreign key constraints never block deletion
        await conn.execute("UPDATE merchants SET user_id = NULL WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM users WHERE id = $1", user_id)

        return {
            "status": "success",
            "message": f"User '{user['full_name']}' ({user['phone_number']}) deleted successfully."
        }


@router.get("/stores")
async def list_stores(
    search: Optional[str] = Query(None, description="Search store name, phone, owner, province, district, commune, village, or street")
):
    pool = await get_db_pool()
    query = """
        SELECT 
            m.id, 
            COALESCE(m.name, m.merchant_name, 'Store') AS name, 
            COALESCE(m.owner_phone, '') AS owner_phone, 
            COALESCE(m.place, '') AS place, 
            COALESCE(m.location, '') AS location, 
            COALESCE(m.province, '') AS province, 
            COALESCE(m.district, '') AS district, 
            COALESCE(m.commune, '') AS commune, 
            COALESCE(m.village, '') AS village, 
            COALESCE(m.street, '') AS street,
            m.created_at,
            COALESCE(u.full_name, u.phone_number, m.name, 'Merchant') AS owner_name,
            COALESCE((
                SELECT COUNT(*) FROM devices d 
                WHERE d.merchant_id::text = m.id::text 
                   OR (m.merchant_id IS NOT NULL AND d.merchant_id::text = m.merchant_id::text)
            ), 0) AS device_count
        FROM merchants m
        LEFT JOIN users u ON m.user_id = u.id OR (m.user_id IS NULL AND m.owner_phone = u.phone_number)
        WHERE 1=1
    """
    params = []
    if search and search.strip():
        s = f"%{search.strip()}%"
        query += """ AND (
            m.name ILIKE $1 
            OR m.owner_phone ILIKE $1 
            OR m.province ILIKE $1 
            OR m.district ILIKE $1 
            OR m.commune ILIKE $1 
            OR m.village ILIKE $1 
            OR m.street ILIKE $1 
            OR m.place ILIKE $1 
            OR m.location ILIKE $1 
            OR u.full_name ILIKE $1
        )"""
        params.append(s)

    query += " ORDER BY m.id DESC"

    async with pool.acquire() as conn:
        try:
            stores = await conn.fetch(query, *params)
        except Exception as e:
            logger.warning(f"Standard list_stores query failed: {e}. Running schema auto-heal and fallback...")
            try:
                await conn.execute("""
                    ALTER TABLE merchants ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(100);
                    ALTER TABLE merchants ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(255);
                    ALTER TABLE merchants ADD COLUMN IF NOT EXISTS user_id INT;
                    ALTER TABLE merchants ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(50);
                    ALTER TABLE merchants ADD COLUMN IF NOT EXISTS place VARCHAR(255);
                    ALTER TABLE merchants ADD COLUMN IF NOT EXISTS location VARCHAR(255);
                    ALTER TABLE merchants ADD COLUMN IF NOT EXISTS province VARCHAR(100);
                    ALTER TABLE merchants ADD COLUMN IF NOT EXISTS district VARCHAR(100);
                    ALTER TABLE merchants ADD COLUMN IF NOT EXISTS commune VARCHAR(100);
                    ALTER TABLE merchants ADD COLUMN IF NOT EXISTS village VARCHAR(100);
                    ALTER TABLE merchants ADD COLUMN IF NOT EXISTS street VARCHAR(255);
                """)
                fallback_query = """
                    SELECT m.id, 
                           COALESCE(m.name, m.merchant_name, 'Store') AS name, 
                           COALESCE(m.owner_phone, '') AS owner_phone, 
                           COALESCE(m.place, '') AS place, 
                           COALESCE(m.location, '') AS location, 
                           COALESCE(m.province, '') AS province, 
                           COALESCE(m.district, '') AS district, 
                           COALESCE(m.commune, '') AS commune, 
                           COALESCE(m.village, '') AS village, 
                           COALESCE(m.street, '') AS street,
                           m.created_at,
                           'Merchant' AS owner_name,
                           0 AS device_count
                    FROM merchants m
                    ORDER BY m.id DESC
                """
                stores = await conn.fetch(fallback_query)
            except Exception as final_e:
                logger.error(f"Fallback list_stores query also failed: {final_e}")
                stores = []

        return {
            "status": "success",
            "stores": [
                {
                    **dict(s),
                    "created_at": s["created_at"].isoformat() if s.get("created_at") else None
                }
                for s in stores
            ]
        }


@router.get("/logs")
async def get_admin_logs(
    search: Optional[str] = Query(None, description="Search TxID, Bank, Store, Device SN, or Phone"),
    log_type: Optional[str] = Query("all", description="all, transactions, or security"),
    limit: int = Query(100, ge=1, le=500),
    page: int = Query(1, ge=1)
):
    pool = await get_db_pool()
    offset = (page - 1) * limit

    async with pool.acquire() as conn:
        # 1. Fetch Transactions Logs
        tx_where = ["1=1"]
        tx_params = []
        param_idx = 1

        if search and search.strip():
            s = f"%{search.strip()}%"
            tx_where.append(f"""(
                t.bank_tx_id ILIKE ${param_idx}
                OR t.bank_name ILIKE ${param_idx}
                OR t.payer_name ILIKE ${param_idx}
                OR d.device_sn ILIKE ${param_idx}
                OR d.device_id ILIKE ${param_idx}
                OR m.name ILIKE ${param_idx}
                OR m.owner_phone ILIKE ${param_idx}
            )""")
            tx_params.append(s)
            param_idx += 1

        tx_query = f"""
            SELECT 
                'TRANSACTION' AS log_category,
                t.id,
                COALESCE(t.bank_tx_id, t.id::text) AS txid,
                COALESCE(t.bank_name, 'Bank') AS bank_name,
                t.amount,
                COALESCE(t.currency::text, 'USD') AS currency,
                t.payer_name,
                COALESCE(t.status::text, 'PROCESSED') AS status,
                t.created_at,
                COALESCE(t.raw_telegram_message, '') AS raw_message,
                COALESCE(d.device_sn, d.device_id, 'Y6B') AS device_sn,
                COALESCE(m.name, 'Store') AS store_name,
                m.owner_phone
            FROM transactions t
            LEFT JOIN devices d ON t.device_id = d.id
            LEFT JOIN merchants m ON d.merchant_id = m.id
            WHERE {" AND ".join(tx_where)}
            ORDER BY t.created_at DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        tx_params.extend([limit, offset])

        # 2. Fetch Security Alerts Logs
        sec_where = ["1=1"]
        sec_params = []
        s_idx = 1
        if search and search.strip():
            s = f"%{search.strip()}%"
            sec_where.append(f"""(
                a.alert_type ILIKE ${s_idx}
                OR a.bank_tx_id ILIKE ${s_idx}
                OR a.bank_name ILIKE ${s_idx}
                OR a.sender_name ILIKE ${s_idx}
                OR a.reason ILIKE ${s_idx}
                OR d.device_sn ILIKE ${s_idx}
                OR m.name ILIKE ${s_idx}
            )""")
            sec_params.append(s)
            s_idx += 1

        sec_query = f"""
            SELECT 
                'SECURITY' AS log_category,
                a.id,
                COALESCE(a.bank_tx_id, a.id::text) AS txid,
                COALESCE(a.bank_name, 'Security') AS bank_name,
                a.amount,
                COALESCE(a.currency, 'USD') AS currency,
                a.sender_name AS payer_name,
                a.severity AS status,
                a.alert_type,
                a.reason,
                a.sender_user_id,
                a.created_at,
                a.raw_message,
                COALESCE(d.device_sn, d.device_id, 'Y6B') AS device_sn,
                COALESCE(m.name, 'Store') AS store_name,
                m.owner_phone
            FROM security_alerts a
            LEFT JOIN devices d ON a.device_id = d.id
            LEFT JOIN merchants m ON a.merchant_id = m.id
            WHERE {" AND ".join(sec_where)}
            ORDER BY a.created_at DESC
            LIMIT ${s_idx} OFFSET ${s_idx + 1}
        """
        sec_params.extend([limit, offset])

        transactions = []
        security_alerts = []

        if log_type in ["all", "transactions"]:
            try:
                tx_rows = await conn.fetch(tx_query, *tx_params)
                transactions = [
                    {
                        **dict(r),
                        "amount": float(r["amount"]) if r["amount"] is not None else 0.0,
                        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                        "ack_at": None
                    }
                    for r in tx_rows
                ]
            except Exception as e:
                print(f"Error fetching tx logs: {e}")

        if log_type in ["all", "security"]:
            try:
                sec_rows = await conn.fetch(sec_query, *sec_params)
                security_alerts = [
                    {
                        **dict(r),
                        "amount": float(r["amount"]) if r["amount"] is not None else 0.0,
                        "created_at": r["created_at"].isoformat() if r["created_at"] else None
                    }
                    for r in sec_rows
                ]
            except Exception as e:
                print(f"Error fetching security logs: {e}")

        # Combine and sort by timestamp
        all_logs = transactions + security_alerts
        all_logs.sort(key=lambda x: x["created_at"] or "", reverse=True)

        return {
            "status": "success",
            "total_count": len(all_logs),
            "logs": all_logs[:limit]
        }
