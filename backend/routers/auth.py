from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

from backend.database import get_db_pool
from backend.security import (
    hash_password,
    verify_password,
    create_access_token,
    normalize_phone_number,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# Schemas
class RegisterSchema(BaseModel):
    phone_number: str = Field(..., min_length=6, max_length=50, description="Phone number for account sign up")
    password: str = Field(..., min_length=6, description="Account password (min 6 chars)")
    full_name: Optional[str] = Field(None, max_length=255, description="User's full name")


class LoginSchema(BaseModel):
    phone_number: str = Field(..., description="Registered phone number")
    password: str = Field(..., description="Account password")


class ProfileUpdateSchema(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    phone_number: Optional[str] = Field(None, min_length=6, max_length=50)


class PasswordChangeSchema(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


@router.post("/register")
async def register(payload: RegisterSchema):
    clean_phone = normalize_phone_number(payload.phone_number)
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        # Check if phone already registered
        existing = await conn.fetchrow("SELECT id FROM users WHERE phone_number = $1", clean_phone)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This phone number is already registered. Please log in instead."
            )

        hashed_pwd = hash_password(payload.password)
        user_row = await conn.fetchrow(
            """
            INSERT INTO users (phone_number, full_name, password_hash, role, status)
            VALUES ($1, $2, $3, 'USER', 'ACTIVE')
            RETURNING id, phone_number, full_name, role, status, created_at
            """,
            clean_phone, payload.full_name or clean_phone, hashed_pwd
        )

        user_dict = dict(user_row)
        access_token = create_access_token({
            "sub": str(user_dict["id"]),
            "user_id": user_dict["id"],
            "phone_number": user_dict["phone_number"],
            "role": user_dict["role"]
        })

        return {
            "status": "success",
            "message": "Account created successfully.",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_dict["id"],
                "phone_number": user_dict["phone_number"],
                "full_name": user_dict["full_name"],
                "role": user_dict["role"],
                "status": user_dict["status"],
                "has_store": False
            }
        }


@router.post("/login")
async def login(payload: LoginSchema):
    clean_phone = normalize_phone_number(payload.phone_number)
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            """
            SELECT id, phone_number, full_name, password_hash, role, status
            FROM users WHERE phone_number = $1
            """,
            clean_phone
        )

        if not user or not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect phone number or password."
            )

        if user["status"] == "SUSPENDED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is suspended. Please contact administrator."
            )

        # Update last login
        await conn.execute(
            "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
            user["id"]
        )

        # Check if user has registered store
        store = await conn.fetchrow(
            "SELECT COALESCE(merchant_id, id::text) AS merchant_id, id, COALESCE(merchant_name, name) AS merchant_name, COALESCE(merchant_name, name) AS name, place, location FROM merchants WHERE user_id = $1 OR owner_phone = $2",
            user["id"], clean_phone
        )

        access_token = create_access_token({
            "sub": str(user["id"]),
            "user_id": user["id"],
            "phone_number": user["phone_number"],
            "role": user["role"]
        })

        return {
            "status": "success",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "phone_number": user["phone_number"],
                "full_name": user["full_name"],
                "role": user["role"],
                "status": user["status"],
                "has_store": store is not None,
                "store": dict(store) if store else None
            }
        }


@router.get("/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        store = await conn.fetchrow(
            "SELECT COALESCE(merchant_id, id::text) AS merchant_id, id, COALESCE(merchant_name, name) AS merchant_name, COALESCE(merchant_name, name) AS name, place, location, owner_phone FROM merchants WHERE user_id = $1 OR owner_phone = $2",
            current_user["id"], current_user["phone_number"]
        )
        
        # Link store to user_id if matched by phone but user_id is null
        if store and store["id"]:
            await conn.execute(
                "UPDATE merchants SET user_id = $1 WHERE id = $2 AND user_id IS NULL",
                current_user["id"], store["id"]
            )

    return {
        "status": "success",
        "user": {
            **current_user,
            "has_store": store is not None,
            "store": dict(store) if store else None
        }
    }


@router.put("/profile")
async def update_profile(
    payload: ProfileUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    pool = await get_db_pool()
    clean_name = payload.full_name.strip()
    
    # Enforce rule: Phone number cannot be changed as it is the login identifier
    if payload.phone_number:
        clean_req_phone = normalize_phone_number(payload.phone_number)
        if clean_req_phone != current_user["phone_number"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number cannot be changed as it is used as your unique login identity."
            )

    target_phone = current_user["phone_number"]

    async with pool.acquire() as conn:
        updated_row = await conn.fetchrow(
            """
            UPDATE users 
            SET full_name = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, phone_number, full_name, role, status, created_at, updated_at
            """,
            clean_name, current_user["id"]
        )

        # Check store info
        store = await conn.fetchrow(
            "SELECT COALESCE(merchant_id, id::text) AS merchant_id, id, COALESCE(merchant_name, name) AS merchant_name, COALESCE(merchant_name, name) AS name, place, location, owner_phone FROM merchants WHERE user_id = $1 OR owner_phone = $2",
            current_user["id"], target_phone
        )

        # Generate refreshed access token
        access_token = create_access_token({
            "sub": str(updated_row["id"]),
            "user_id": updated_row["id"],
            "phone_number": updated_row["phone_number"],
            "role": updated_row["role"]
        })

        user_data = {
            "id": updated_row["id"],
            "phone_number": updated_row["phone_number"],
            "full_name": updated_row["full_name"],
            "role": updated_row["role"],
            "status": updated_row["status"],
            "created_at": updated_row["created_at"].isoformat() if updated_row["created_at"] else None,
            "has_store": store is not None,
            "store": dict(store) if store else None
        }

        return {
            "status": "success",
            "message": "Profile updated successfully.",
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }


@router.put("/change-password")
async def change_password(
    payload: PasswordChangeSchema,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT password_hash FROM users WHERE id = $1",
            current_user["id"]
        )
        if not user or not verify_password(payload.current_password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect."
            )

        new_hash = hash_password(payload.new_password)
        await conn.execute(
            "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            new_hash, current_user["id"]
        )

    return {
        "status": "success",
        "message": "Password changed successfully."
    }
