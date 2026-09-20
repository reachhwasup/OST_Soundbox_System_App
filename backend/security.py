import os
import secrets
import hashlib
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
if len(SECRET_KEY) < 32:
    raise RuntimeError("JWT_SECRET_KEY must be configured with at least 32 random characters.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

security_scheme = HTTPBearer(auto_error=False)


def normalize_phone_number(phone: str) -> str:
    """Normalizes phone input (removes spaces, dashes, leading +855)."""
    if not phone:
        return ""
    clean = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if clean.startswith("+855"):
        clean = "0" + clean[4:]
    elif clean.startswith("855") and len(clean) >= 11:
        clean = "0" + clean[3:]
    return clean


def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2 HMAC-SHA256 with a unique salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored PBKDF2 hash."""
    try:
        if "$" not in hashed_password:
            return False
        salt, key_hex = hashed_password.split("$", 1)
        test_key = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return secrets.compare_digest(test_key.hex(), key_hex)
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": int(expire.timestamp()), "iat": int(now.timestamp())})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"require": ["exp", "iat", "sub"]})
        return payload
    except jwt.PyJWTError:
        return None


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> Dict[str, Any]:
    """FastAPI dependency to extract and authenticate the current user from Bearer token."""
    from backend.database import get_db_pool

    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    subject = payload["sub"]
    if not isinstance(subject, str) or not subject.isascii() or not subject.isdigit():
        raise HTTPException(status_code=401, detail="Invalid authentication subject.")
    user_id = int(subject)
    if user_id < 1 or user_id > 2147483647:
        raise HTTPException(status_code=401, detail="Invalid authentication subject.")

    user_cols = """
        u.id, u.phone_number, u.full_name, u.role, u.status, u.is_active, u.last_login_at, u.created_at, u.updated_at,
        u.branch_id, b.branch_name, b.branch_code,
        COALESCE(u.permissions, '{"tabs": ["all"], "crud": ["all"]}'::jsonb) AS permissions
    """
    user_from = "FROM users u LEFT JOIN branches b ON u.branch_id = b.branch_id"

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            f"SELECT {user_cols} {user_from} WHERE u.id = $1", user_id
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_dict = dict(user)
    if user_dict.get("is_active") is False or user_dict["status"] != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended. Please contact administrator.",
        )

    return user_dict


async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """FastAPI dependency ensuring the current user has ADMIN role."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required for this action.",
        )
    return current_user


def can_view_cost(user: Dict[str, Any]) -> bool:
    """
    Supplier cost (base price, stock value) is visible to super admins (no branch) and to users whose
    permissions.crud contains "all" or "view_cost".
    """
    if not user or user.get("role") != "ADMIN":
        return False
    if user.get("branch_id") is None:
        return True
    perms = user.get("permissions") or {}
    if isinstance(perms, str):
        import json
        try:
            perms = json.loads(perms)
        except Exception:
            perms = {}
    crud = perms.get("crud") or []
    return "all" in crud or "view_cost" in crud


def require_permission(perm: str):
    """FastAPI dependency to verify if user has specific CRUD or action permission."""
    async def permission_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        perms = current_user.get("permissions") or {}
        if isinstance(perms, str):
            import json
            try:
                perms = json.loads(perms)
            except Exception:
                perms = {}
        crud = perms.get("crud", [])
        if "all" in crud or perm in crud or (current_user.get("role") == "ADMIN" and (not crud or "all" in crud)):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Action forbidden: '{perm}' permission required."
        )
    return permission_checker



def check_account_management(actor, target=None, action="update"):
    """Enforce account administration scope independently of UI visibility."""
    if actor.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Administrative privileges required.")
    branch = actor.get("branch_id")
    if branch is None:
        return
    import json
    permissions = actor.get("permissions") or {}
    if isinstance(permissions, str):
        try:
            permissions = json.loads(permissions)
        except (ValueError, TypeError):
            permissions = {}
    crud = permissions.get("crud", []) if isinstance(permissions, dict) else []
    if "all" not in crud and action not in crud:
        raise HTTPException(status_code=403, detail="Account management permission required.")
    if target is not None and target.get("branch_id") != branch:
        raise HTTPException(status_code=403, detail="Account is outside your branch.")
