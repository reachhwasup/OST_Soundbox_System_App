import logging
from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from backend.database import get_db_pool
from backend.security import get_current_user, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


class SupplierCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Supplier Name")
    contact_person: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=150)
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = True


class SupplierUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    contact_person: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=150)
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
async def list_suppliers(
    active_only: bool = Query(False, description="Filter only active suppliers"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves all suppliers with device counts."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Ensure suppliers table and devices.supplier_id exist
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
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS supplier_id INT;
        """)

        where_clause = "WHERE s.is_active = TRUE" if active_only else ""
        query = f"""
            SELECT s.id, s.name, s.contact_person, s.phone, s.email, s.address, s.notes, s.is_active,
                   s.created_at, s.updated_at,
                   COUNT(d.id)::int AS device_count
            FROM suppliers s
            LEFT JOIN devices d ON d.supplier_id = s.id
            {where_clause}
            GROUP BY s.id
            ORDER BY s.id ASC
        """
        rows = await conn.fetch(query)

        suppliers = [
            {
                "id": r["id"],
                "name": r["name"],
                "contact_person": r["contact_person"],
                "phone": r["phone"],
                "email": r["email"],
                "address": r["address"],
                "notes": r["notes"],
                "is_active": r["is_active"],
                "device_count": r["device_count"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
            }
            for r in rows
        ]

    return {"status": "success", "total": len(suppliers), "data": suppliers}


@router.get("/{supplier_id}", response_model=Dict[str, Any])
async def get_supplier(
    supplier_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves detailed information for a specific supplier."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT s.id, s.name, s.contact_person, s.phone, s.email, s.address, s.notes, s.is_active,
                   s.created_at, s.updated_at,
                   COUNT(d.id)::int AS device_count
            FROM suppliers s
            LEFT JOIN devices d ON d.supplier_id = s.id
            WHERE s.id = $1
            GROUP BY s.id
        """, supplier_id)

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Supplier with ID {supplier_id} not found."
            )

        supplier = {
            "id": row["id"],
            "name": row["name"],
            "contact_person": row["contact_person"],
            "phone": row["phone"],
            "email": row["email"],
            "address": row["address"],
            "notes": row["notes"],
            "is_active": row["is_active"],
            "device_count": row["device_count"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        }

    return {"status": "success", "data": supplier}


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreateSchema,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Creates a new supplier (Admin only)."""
    name_clean = payload.name.strip()
    if not name_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Supplier name cannot be empty.")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchval(
            "SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))",
            name_clean
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Supplier with name '{name_clean}' already exists (ID: {existing})."
            )

        new_row = await conn.fetchrow("""
            INSERT INTO suppliers (name, contact_person, phone, email, address, notes, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, contact_person, phone, email, address, notes, is_active, created_at, updated_at
        """, name_clean, payload.contact_person, payload.phone, payload.email, payload.address, payload.notes, payload.is_active)

    return {
        "status": "success",
        "message": f"Supplier '{name_clean}' created successfully.",
        "data": dict(new_row)
    }


@router.put("/{supplier_id}", response_model=Dict[str, Any])
async def update_supplier(
    supplier_id: int,
    payload: SupplierUpdateSchema,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Updates an existing supplier (Admin only)."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id, name FROM suppliers WHERE id = $1", supplier_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Supplier with ID {supplier_id} not found."
            )

        updates = []
        params = []
        idx = 1

        name_changed = False
        new_name = None

        if payload.name is not None:
            cleaned_name = payload.name.strip()
            if not cleaned_name:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Supplier name cannot be empty.")
            dup = await conn.fetchval(
                "SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND id != $2",
                cleaned_name, supplier_id
            )
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Another supplier already uses name '{cleaned_name}'."
                )
            updates.append(f"name = ${idx}")
            params.append(cleaned_name)
            idx += 1
            name_changed = True
            new_name = cleaned_name

        if payload.contact_person is not None:
            updates.append(f"contact_person = ${idx}")
            params.append(payload.contact_person.strip() if payload.contact_person else None)
            idx += 1

        if payload.phone is not None:
            updates.append(f"phone = ${idx}")
            params.append(payload.phone.strip() if payload.phone else None)
            idx += 1

        if payload.email is not None:
            updates.append(f"email = ${idx}")
            params.append(payload.email.strip() if payload.email else None)
            idx += 1

        if payload.address is not None:
            updates.append(f"address = ${idx}")
            params.append(payload.address.strip() if payload.address else None)
            idx += 1

        if payload.notes is not None:
            updates.append(f"notes = ${idx}")
            params.append(payload.notes.strip() if payload.notes else None)
            idx += 1

        if payload.is_active is not None:
            updates.append(f"is_active = ${idx}")
            params.append(payload.is_active)
            idx += 1

        if not updates:
            return {"status": "success", "message": "No changes provided.", "data": dict(existing)}

        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(supplier_id)
        query = f"UPDATE suppliers SET {', '.join(updates)} WHERE id = ${idx} RETURNING *"

        updated_row = await conn.fetchrow(query, *params)

    return {
        "status": "success",
        "message": "Supplier updated successfully.",
        "data": dict(updated_row)
    }


@router.delete("/{supplier_id}", response_model=Dict[str, Any])
async def delete_supplier(
    supplier_id: int,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Deletes or deactivates a supplier (Admin only)."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id, name FROM suppliers WHERE id = $1", supplier_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Supplier with ID {supplier_id} not found."
            )

        # Check if devices are linked
        device_count = await conn.fetchval(
            "SELECT COUNT(*) FROM devices WHERE supplier_id = $1",
            supplier_id
        )

        if device_count and device_count > 0:
            # Soft-deactivate to preserve audit trail
            await conn.execute(
                "UPDATE suppliers SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                supplier_id
            )
            return {
                "status": "success",
                "message": f"Supplier '{existing['name']}' has {device_count} linked soundbox(es). The supplier was deactivated instead of deleted to protect historical stock records.",
                "action": "deactivated"
            }

        # Hard delete if no devices are attached
        await conn.execute("DELETE FROM suppliers WHERE id = $1", supplier_id)

    return {
        "status": "success",
        "message": f"Supplier '{existing['name']}' deleted successfully.",
        "action": "deleted"
    }
