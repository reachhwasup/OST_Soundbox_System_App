from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from backend.database import get_db_pool
from backend.security import get_current_user

router = APIRouter(prefix="/api/stores", tags=["Stores"])


class StoreRegisterSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Store / Merchant Name")
    place: str = Field(..., min_length=2, max_length=255, description="Place / Market / Mall / Area")
    location: str = Field(..., min_length=2, max_length=255, description="Location / Street / City / Province")
    province: Optional[str] = None
    district: Optional[str] = None
    commune: Optional[str] = None
    village: Optional[str] = None
    street: Optional[str] = None


class StoreUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    place: Optional[str] = Field(None, min_length=2, max_length=255)
    location: Optional[str] = Field(None, min_length=2, max_length=255)
    province: Optional[str] = None
    district: Optional[str] = None
    commune: Optional[str] = None
    village: Optional[str] = None
    street: Optional[str] = None


@router.get("/my-stores")
@router.get("/my-store")
async def get_my_stores(current_user: Dict[str, Any] = Depends(get_current_user)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Fetch all stores belonging to this user
        stores = await conn.fetch(
            """
            SELECT id, user_id, name, owner_phone, place, location,
                   province, district, commune, village, street,
                   created_at, updated_at
            FROM merchants 
            WHERE user_id = $1 OR (user_id IS NULL AND owner_phone = $2)
            ORDER BY id ASC
            """,
            current_user["id"], current_user["phone_number"]
        )

        # Link any unlinked stores to user_id
        for s in stores:
            if s["user_id"] is None:
                await conn.execute("UPDATE merchants SET user_id = $1 WHERE id = $2", current_user["id"], s["id"])

        if not stores:
            return {
                "status": "success",
                "has_store": False,
                "stores": [],
                "store": None,
                "devices": [],
                "recent_transactions": []
            }

        # For each store, fetch linked devices and recent transactions
        enhanced_stores = []
        all_devices = []
        all_transactions = []

        for s in stores:
            store_id = s["id"]
            devices = await conn.fetch(
                """
                SELECT id, device_sn, device_model, telegram_chat_id, status,
                       COALESCE(battery, '100%') AS battery,
                       COALESCE(signal, 'Good') AS signal,
                       COALESCE(last_online, last_heartbeat, updated_at, created_at) AS last_active,
                       last_online, last_heartbeat, created_at, updated_at
                FROM devices
                WHERE merchant_id = $1
                ORDER BY id ASC
                """,
                store_id
            )

            transactions = await conn.fetch(
                """
                SELECT t.id, t.bank_name, t.bank_tx_id, t.amount, t.currency, t.payer_name, t.status, t.created_at, d.device_sn
                FROM transactions t
                JOIN devices d ON t.device_id = d.id
                WHERE d.merchant_id = $1
                ORDER BY t.created_at DESC
                LIMIT 20
                """,
                store_id
            )

            alerts = await conn.fetch(
                """
                SELECT a.id, a.alert_type, a.severity, a.bank_name, a.bank_tx_id, a.amount, a.currency, 
                       a.sender_user_id, a.sender_name, a.reason, a.created_at, d.device_sn
                FROM security_alerts a
                LEFT JOIN devices d ON a.device_id = d.id
                WHERE a.merchant_id = $1
                ORDER BY a.created_at DESC
                LIMIT 20
                """,
                store_id
            )

            store_dict = {
                **dict(s),
                "created_at": s["created_at"].isoformat() if s["created_at"] else None,
                "updated_at": s["updated_at"].isoformat() if s["updated_at"] else None,
                "devices": [
                    {
                        **dict(d),
                        "created_at": d["created_at"].isoformat() if d["created_at"] else None,
                        "last_heartbeat": d["last_heartbeat"].isoformat() if d["last_heartbeat"] else None
                    }
                    for d in devices
                ],
                "recent_transactions": [
                    {
                        **dict(tx),
                        "amount": float(tx["amount"]),
                        "created_at": tx["created_at"].isoformat() if tx["created_at"] else None
                    }
                    for tx in transactions
                ],
                "security_alerts": [
                    {
                        **dict(alt),
                        "amount": float(alt["amount"]) if alt["amount"] is not None else None,
                        "created_at": alt["created_at"].isoformat() if alt["created_at"] else None
                    }
                    for alt in alerts
                ]
            }

            enhanced_stores.append(store_dict)
            all_devices.extend(store_dict["devices"])
            all_transactions.extend(store_dict["recent_transactions"])

        # Sort all transactions by date
        all_transactions.sort(key=lambda x: x.get("created_at") or "", reverse=True)

        all_alerts = []
        for s in enhanced_stores:
            all_alerts.extend(s.get("security_alerts", []))
        all_alerts.sort(key=lambda x: x.get("created_at") or "", reverse=True)

        return {
            "status": "success",
            "has_store": True,
            "total_stores": len(enhanced_stores),
            "stores": enhanced_stores,
            "store": enhanced_stores[0], # Default primary store
            "devices": all_devices,
            "recent_transactions": all_transactions[:30],
            "security_alerts": all_alerts[:30]
        }



@router.post("/register")
async def register_store(
    payload: StoreRegisterSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    pool = await get_db_pool()
    phone = current_user["phone_number"]
    clean_name = payload.name.strip()
    clean_place = payload.place.strip()
    clean_location = payload.location.strip()
    province = payload.province.strip() if payload.province else None
    district = payload.district.strip() if payload.district else None
    commune = payload.commune.strip() if payload.commune else None
    village = payload.village.strip() if payload.village else None
    street = payload.street.strip() if payload.street else clean_place

    async with pool.acquire() as conn:
        # Insert new store for user (supports multiple stores)
        store_id = await conn.fetchval(
            """
            INSERT INTO merchants (user_id, name, owner_phone, place, location, province, district, commune, village, street)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
            """,
            current_user["id"], clean_name, phone, clean_place, clean_location,
            province, district, commune, village, street
        )

        return {
            "status": "success",
            "message": f"Store '{clean_name}' created successfully.",
            "store_id": store_id,
            "store": {
                "id": store_id,
                "user_id": current_user["id"],
                "name": clean_name,
                "owner_phone": phone,
                "place": clean_place,
                "location": clean_location,
                "province": province,
                "district": district,
                "commune": commune,
                "village": village,
                "street": street,
                "devices": [],
                "recent_transactions": []
            }
        }


@router.put("/{store_id}")
@router.put("/my-store")
async def update_store(
    payload: StoreUpdateSchema,
    store_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        if store_id:
            store = await conn.fetchrow(
                "SELECT id, name, place, location, province, district, commune, village, street FROM merchants WHERE id = $1 AND (user_id = $2 OR owner_phone = $3)",
                store_id, current_user["id"], current_user["phone_number"]
            )
        else:
            store = await conn.fetchrow(
                "SELECT id, name, place, location, province, district, commune, village, street FROM merchants WHERE user_id = $1 OR owner_phone = $2 ORDER BY id ASC LIMIT 1",
                current_user["id"], current_user["phone_number"]
            )

        if not store:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found or you do not have permission to modify it."
            )

        # Enforce business rule: Store must unlink all devices before updating store details
        if current_user.get("role") != "ADMIN":
            linked_devices_count = await conn.fetchval(
                "SELECT COUNT(*) FROM devices WHERE merchant_id = $1",
                store["id"]
            )
            if linked_devices_count and linked_devices_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot update store while {linked_devices_count} Soundbox device(s) are linked. Please unlink all devices first."
                )

        new_name = payload.name.strip() if payload.name else store["name"]
        new_place = payload.place.strip() if payload.place else store["place"]
        new_location = payload.location.strip() if payload.location else store["location"]
        new_province = payload.province.strip() if payload.province else store["province"]
        new_district = payload.district.strip() if payload.district else store["district"]
        new_commune = payload.commune.strip() if payload.commune else store["commune"]
        new_village = payload.village.strip() if payload.village else store["village"]
        new_street = payload.street.strip() if payload.street else (new_place or store["street"])

        await conn.execute(
            """
            UPDATE merchants 
            SET name = $1, place = $2, location = $3,
                province = $4, district = $5, commune = $6, village = $7, street = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            """,
            new_name, new_place, new_location,
            new_province, new_district, new_commune, new_village, new_street,
            store["id"]
        )

        return {
            "status": "success",
            "message": f"Store '{new_name}' updated successfully.",
            "store": {
                "id": store["id"],
                "name": new_name,
                "place": new_place,
                "location": new_location,
                "province": new_province,
                "district": new_district,
                "commune": new_commune,
                "village": new_village,
                "street": new_street
            }
        }


@router.delete("/{store_id}")
async def delete_store(
    store_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        store = await conn.fetchrow(
            "SELECT id, name FROM merchants WHERE id = $1 AND (user_id = $2 OR owner_phone = $3)",
            store_id, current_user["id"], current_user["phone_number"]
        )
        if not store and current_user["role"] != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found or unauthorized."
            )

        await conn.execute("DELETE FROM merchants WHERE id = $1", store_id)

        return {
            "status": "success",
            "message": f"Store '{store['name']}' deleted successfully."
        }
