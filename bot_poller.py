import os
import asyncio
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("telegram_bot_poller")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8974351475:AAHTzxM7U_XvvUuwzhcFUdtDnpbuAyzcFcQ")
WEBHOOK_URL = os.getenv("FASTAPI_TELEGRAM_WEBHOOK_URL") or os.getenv("FASTAPI_WEBHOOK_URL") or "http://api:8000/webhook/telegram"



async def poll_telegram_updates():
    logger.info("Starting Telegram Bot Polling Worker for Local & Real-Time Setup...")
    offset = 0
    
    # 1. Ensure webhook is removed so getUpdates works
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            await client.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true")
            logger.info("Telegram Webhook cleared for Polling mode.")
        except Exception as e:
            logger.warning(f"Error resetting webhook: {e}")

    # 2. Main Long Polling Loop
    while True:
        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
            params = {
                "offset": offset,
                "timeout": 30,
                "allowed_updates": ["message", "channel_post", "my_chat_member", "chat_member"]
            }

            async with httpx.AsyncClient(timeout=40.0) as client:
                resp = await client.get(url, params=params)
                
                if resp.status_code != 200:
                    logger.warning(f"Telegram getUpdates returned {resp.status_code}: {resp.text}")
                    await asyncio.sleep(3)
                    continue

                data = resp.json()
                updates = data.get("result", [])

                for update in updates:
                    update_id = update.get("update_id", 0)
                    offset = max(offset, update_id + 1)

                    logger.info(f"Received Telegram Update ID {update_id}: forwarding to FastAPI webhook...")
                    
                    # Forward the update payload directly to FastAPI's webhook endpoint
                    try:
                        async with httpx.AsyncClient(timeout=15.0) as webhook_client:
                            fw_resp = await webhook_client.post(WEBHOOK_URL, json=update)
                            logger.info(f"Forwarded Update ID {update_id} -> FastAPI Status: {fw_resp.status_code}")
                    except Exception as fe:
                        logger.error(f"Failed to forward update to FastAPI: {fe}")

        except httpx.RequestError as req_err:
            logger.warning(f"Network error in getUpdates: {req_err}")
            await asyncio.sleep(3)
        except Exception as e:
            logger.error(f"Unexpected error in polling loop: {e}")
            await asyncio.sleep(3)


if __name__ == "__main__":
    asyncio.run(poll_telegram_updates())
