#!/usr/bin/env python3
"""
CLI utility to create or update an Admin user account in PostgreSQL.
Usage:
    python create_admin.py <phone_number> <password> [full_name]

Example:
    python create_admin.py 012345678 Admin123! "System Administrator"
"""

import sys
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:fDdiFw_KB2930otN@localhost:5432/postgres")

from backend.security import hash_password, normalize_phone_number


async def create_admin(phone: str, password: str, name: str = "Administrator"):
    clean_phone = normalize_phone_number(phone)
    if not clean_phone:
        print("❌ Error: Invalid phone number.")
        return

    if len(password) < 6:
        print("❌ Error: Password must be at least 6 characters.")
        return

    hashed = hash_password(password)

    print(f"Connecting to database at: {DATABASE_URL}")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        await conn.execute("""
            INSERT INTO users (phone_number, full_name, password_hash, role, status)
            VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE')
            ON CONFLICT (phone_number) DO UPDATE
            SET full_name = EXCLUDED.full_name,
                password_hash = EXCLUDED.password_hash,
                role = 'ADMIN',
                status = 'ACTIVE',
                updated_at = CURRENT_TIMESTAMP;
        """, clean_phone, name, hashed)
        await conn.close()
        print(f"✅ Successfully created/updated Admin account:")
        print(f"   Phone:    {clean_phone}")
        print(f"   Name:     {name}")
        print(f"   Role:     ADMIN")
        print(f"   Status:   ACTIVE")
    except Exception as e:
        print(f"❌ Database error: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        phone = input("Enter Admin Phone Number (e.g. 012345678): ").strip()
        password = input("Enter Admin Password: ").strip()
        name = input("Enter Admin Full Name [System Administrator]: ").strip() or "System Administrator"
    else:
        phone = sys.argv[1]
        password = sys.argv[2]
        name = sys.argv[3] if len(sys.argv) > 3 else "System Administrator"

    asyncio.run(create_admin(phone, password, name))
