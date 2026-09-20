from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from backend.database import get_db_pool
from backend.security import get_current_user, require_admin

router = APIRouter(prefix="/api/branches", tags=["Branches"])


class BranchCreateSchema(BaseModel):
    branch_code: str = Field(..., min_length=2, max_length=50, description="Unique branch code e.g. PP-01")
    branch_name: str = Field(..., min_length=2, max_length=150, description="Branch display name")
    location: Optional[str] = Field(None, description="City, province or physical address")


class BranchUpdateSchema(BaseModel):
    branch_code: Optional[str] = Field(None, min_length=2, max_length=50)
    branch_name: Optional[str] = Field(None, min_length=2, max_length=150)
    location: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_branches(
    include_inactive: bool = Query(False, description="Also return branches that have been closed"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Returns branches with their in-stock unit count and active user count.
    """
    # Called directly (tests, other routers) the flag arrives as FastAPI's Query default, not a bool
    include_inactive = include_inactive is True

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        branches = await conn.fetch(f"""
            SELECT
                b.branch_id,
                b.branch_code,
                b.branch_name,
                b.location,
                b.is_active,
                b.created_at,
                COALESCE(stock_cnt.in_stock_count, 0) AS stock_count,
                COALESCE(user_cnt.user_count, 0) AS user_count
            FROM branches b
            LEFT JOIN (
                SELECT branch_id, COUNT(*) AS in_stock_count
                FROM v_branch_product_stock
                GROUP BY branch_id
            ) stock_cnt ON b.branch_id = stock_cnt.branch_id
            LEFT JOIN (
                SELECT branch_id, COUNT(*) AS user_count
                FROM users
                WHERE COALESCE(is_active, TRUE) = TRUE
                GROUP BY branch_id
            ) user_cnt ON b.branch_id = user_cnt.branch_id
            {"" if include_inactive else "WHERE b.is_active = TRUE"}
            ORDER BY b.branch_id ASC;
        """)

        return {
            "status": "success",
            "data": [
                {
                    "id": r["branch_id"],
                    "branch_id": r["branch_id"],
                    "branch_code": r["branch_code"],
                    "branch_name": r["branch_name"],
                    "location": r["location"] or "",
                    "is_active": r["is_active"],
                    "stock_count": r["stock_count"],
                    "user_count": r["user_count"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None
                }
                for r in branches
            ]
        }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_branch(
    payload: BranchCreateSchema,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Creates a new branch. Requires Administrator role.
    """
    code = payload.branch_code.strip().upper()
    name = payload.branch_name.strip()
    loc = (payload.location or "").strip()

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT branch_id FROM branches WHERE branch_code = $1", code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Branch code '{code}' already exists."
            )

        row = await conn.fetchrow("""
            INSERT INTO branches (branch_code, branch_name, location, is_active)
            VALUES ($1, $2, $3, TRUE)
            RETURNING branch_id, branch_code, branch_name, location, is_active, created_at
        """, code, name, loc)

        return {
            "status": "success",
            "message": f"Branch '{name}' created successfully.",
            "data": dict(row)
        }


@router.put("/{branch_id}")
async def update_branch(
    branch_id: int,
    payload: BranchUpdateSchema,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Updates branch code, name, location or status. Requires Administrator role.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        branch = await conn.fetchrow("SELECT * FROM branches WHERE branch_id = $1", branch_id)
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found.")

        updates = []
        params = []
        idx = 1

        if payload.branch_code is not None:
            code = payload.branch_code.strip().upper()
            existing = await conn.fetchrow("SELECT branch_id FROM branches WHERE branch_code = $1 AND branch_id != $2", code, branch_id)
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Branch code '{code}' is already used.")
            updates.append(f"branch_code = ${idx}")
            params.append(code)
            idx += 1

        if payload.branch_name is not None:
            updates.append(f"branch_name = ${idx}")
            params.append(payload.branch_name.strip())
            idx += 1

        if payload.location is not None:
            updates.append(f"location = ${idx}")
            params.append(payload.location.strip())
            idx += 1

        if payload.is_active is not None:
            updates.append(f"is_active = ${idx}")
            params.append(payload.is_active)
            idx += 1

        if not updates:
            return {"status": "success", "message": "No changes made."}

        params.append(branch_id)
        query = f"UPDATE branches SET {', '.join(updates)} WHERE branch_id = ${idx} RETURNING *"
        updated_row = await conn.fetchrow(query, *params)

        return {
            "status": "success",
            "message": "Branch updated successfully.",
            "data": dict(updated_row)
        }


@router.delete("/{branch_id}")
async def delete_branch(
    branch_id: int,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Deletes a branch that nothing points at, otherwise closes it (is_active = FALSE) so history stays intact.
    Requires Administrator role.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        branch = await conn.fetchrow("SELECT branch_id, branch_name FROM branches WHERE branch_id = $1", branch_id)
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found.")

        counts = await conn.fetchrow("""
            SELECT
                (SELECT COUNT(*) FROM pos_invoices WHERE branch_id = $1)::int AS movements,
                (SELECT COUNT(*) FROM devices WHERE branch_id = $1)::int AS devices,
                (SELECT COUNT(*) FROM users WHERE branch_id = $1)::int AS users
        """, branch_id)
        in_use = counts["movements"] + counts["devices"] + counts["users"]

        if in_use:
            await conn.execute("UPDATE branches SET is_active = FALSE WHERE branch_id = $1", branch_id)
            return {
                "status": "success",
                "message": (f"'{branch['branch_name']}' still has {counts['movements']} stock movement(s), "
                            f"{counts['devices']} device(s) and {counts['users']} user(s), so it was closed instead of deleted."),
                "data": {"branch_id": branch_id, "deactivated": True},
            }

        await conn.execute("DELETE FROM branches WHERE branch_id = $1", branch_id)
        return {
            "status": "success",
            "message": f"Branch '{branch['branch_name']}' deleted.",
            "data": {"branch_id": branch_id, "deactivated": False},
        }
