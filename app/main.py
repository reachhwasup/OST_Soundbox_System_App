from fastapi import FastAPI, Request, HTTPException, Header, Depends
import asyncpg
import os
import logging
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from typing import Optional

from fastapi.middleware.cors import CORSMiddleware
from app.telegram_parser import AdvancedBankNotificationParser
from app.mqtt_publisher import AdvancedSoundboxMQTTPublisher
from backend.database import init_db, get_db_pool
from backend.routers import auth, stores, devices, admin

# --- LOGGING CONFIGURATION ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("IoT_FastAPI")

# --- ENVIRONMENT CONFIGURATIONS ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:fDdiFw_KB2930otN@postgres:5432/postgres")
API_SECRET_KEY = os.getenv("API_SECRET_KEY", "your-api-key")
MQTT_BROKER = os.getenv("MQTT_BROKER", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

db_pool = None
mqtt_publisher = None

# --- LIFESPAN (DATABASE POOL & MQTT MANAGEMENT) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool, mqtt_publisher
    try:
        # 1. Initialize database schema & seeds
        try:
            await init_db()
        except Exception as de:
            logger.warning(f"Database schema initialization warning: {de}")

        db_pool = await get_db_pool()
        logger.info("PostgreSQL database connection pool established successfully.")
        
        # 2. Connect to MQTT Broker
        try:
            mqtt_publisher = AdvancedSoundboxMQTTPublisher(
                broker_host=MQTT_BROKER,
                broker_port=MQTT_PORT,
                client_id="fastapi_soundbox_gateway"
            )
            mqtt_publisher.connect()
            logger.info("MQTT Publisher initialized and running.")
        except Exception as me:
            logger.warning(f"MQTT Broker connection warning (will continue): {me}")

        yield
    except Exception as e:
        logger.error(f"Failed during lifespan startup: {e}")
        raise e
    finally:
        if mqtt_publisher:
            try:
                mqtt_publisher.disconnect()
            except Exception:
                pass
        if db_pool:
            await db_pool.close()
            logger.info("PostgreSQL database connection pool closed.")

app = FastAPI(
    title="OST Soundbox System Gateway & Dashboard API",
    version="2.0.0",
    lifespan=lifespan
)

# --- CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MOUNT BACKEND ROUTERS ---
app.include_router(auth.router)
app.include_router(stores.router)
app.include_router(devices.router)
app.include_router(admin.router)

# --- PYDANTIC SCHEMAS (VALIDATION) ---
class UserSyncSchema(BaseModel):
    chat_id: str = Field(..., description="Telegram Chat/Group ID")
    user_id: str = Field(..., description="Telegram User ID")
    username: Optional[str] = Field(None, description="Telegram Username")
    full_name: Optional[str] = Field(None, description="User Full Name")
    is_authorized: bool = Field(False, description="Authorization status")

class UserbotMessageSchema(BaseModel):
    chat_id: str
    text: str
    user_id: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_bot: bool = False
    is_verified: bool = False
    forward_from_chat_id: Optional[str] = None

# --- SECURITY DEPENDENCY ---
async def verify_api_key(x_api_key: str = Header(None)):
    if not x_api_key or x_api_key != API_SECRET_KEY:
        logger.warning("Unauthorized access attempt with invalid or missing API Key.")
        raise HTTPException(status_code=403, detail="Forbidden: Invalid or missing API Key")
    return x_api_key

# --- API ENDPOINTS ---

@app.get("/health")
async def health_check():
    """Health check for system and container monitoring."""
    return {
        "status": "healthy",
        "database": "connected" if db_pool else "disconnected",
        "mqtt": "connected" if mqtt_publisher and mqtt_publisher.is_connected() else "disconnected"
    }

@app.post("/webhook/telegram-userbot", dependencies=[Depends(verify_api_key)])
async def telegram_userbot_webhook(payload: UserbotMessageSchema):
    """Receive and parse Telegram bank notifications and publish to MQTT Soundbox."""
    logger.info(f"Userbot Message Received -> Chat: {payload.chat_id} | Sender: {payload.user_id}")
    
    parsed = AdvancedBankNotificationParser.parse_message(payload.text)
    if not parsed:
        logger.debug(f"Message in Chat {payload.chat_id} is not a recognizable bank transaction.")
        return {
            "status": "ignored", 
            "action": "non_transaction_message",
            "chat_id": payload.chat_id
        }

    logger.info(f"Parsed Transaction: Amount={parsed['amount']} {parsed['currency']} | Bill={parsed['bill_number']} | Bank={parsed['bank_name']}")

    if not db_pool:
        raise HTTPException(status_code=500, detail="Database pool is not available")

    async with db_pool.acquire() as conn:
        # Check for device linked to this telegram_chat_id
        device = await conn.fetchrow(
            "SELECT d.id, d.device_sn, d.merchant_id FROM devices d WHERE d.telegram_chat_id = $1 AND d.status = 'ACTIVE'",
            str(payload.chat_id)
        )
        
        # Check deduplication
        existing_tx = await conn.fetchrow(
            "SELECT id FROM transactions WHERE bill_number = $1 AND bank_name = $2",
            parsed["bill_number"], parsed["bank_name"]
        )
        if existing_tx:
            logger.warning(f"Duplicate transaction ignored: {parsed['bill_number']}")
            return {"status": "ignored", "reason": "duplicate_transaction"}

        merchant_id = device["merchant_id"] if device else None
        device_id = device["id"] if device else None

        # Insert transaction
        await conn.execute("""
            INSERT INTO transactions (merchant_id, device_id, bank_name, bill_number, amount, currency, status, raw_message)
            VALUES ($1, $2, $3, $4, $5, $6::currency_type, 'PROCESSED', $7)
        """, merchant_id, device_id, parsed["bank_name"], parsed["bill_number"], parsed["amount"], parsed["currency"], payload.text)

        # Publish MQTT audio broadcast if device is linked
        if device and mqtt_publisher:
            device_sn = device["device_sn"]
            mqtt_publisher.publish_payment_voice(
                device_sn=device_sn,
                amount=parsed["amount"],
                currency=parsed["currency"],
                bill_number=parsed["bill_number"]
            )
            logger.info(f"Published audio payment alert to Soundbox '{device_sn}'")

    return {
        "status": "success",
        "action": "broadcast_and_recorded",
        "transaction": parsed
    }
