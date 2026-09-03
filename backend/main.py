from fastapi import FastAPI, Request, HTTPException
import os
import logging
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from backend.database import init_db, get_db_pool
from backend.routers import auth, stores, devices, admin

# --- LOGGING CONFIGURATION ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("Soundbox_Backend")

db_pool = None

# --- LIFESPAN (DATABASE POOL MANAGEMENT) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    try:
        # 1. Initialize schema & default seeds
        try:
            await init_db()
        except Exception as de:
            logger.warning(f"Database schema initialization warning: {de}")

        db_pool = await get_db_pool()
        logger.info("PostgreSQL database connection pool established successfully.")
        yield
    except Exception as e:
        logger.error(f"Failed during lifespan startup: {e}")
        raise e
    finally:
        if db_pool:
            await db_pool.close()
            logger.info("PostgreSQL database connection pool closed.")


app = FastAPI(
    title="OST Soundbox System API",
    version="2.0.0",
    description="Backend REST API for OST Soundbox System supporting Admin & Merchant Dashboards, Device Registration, and Analytics.",
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

# --- ROUTER REGISTRATIONS ---
app.include_router(auth.router)
app.include_router(stores.router)
app.include_router(devices.router)
app.include_router(admin.router)


@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
async def health_check():
    """Health check endpoint for container health probes."""
    return {
        "status": "healthy",
        "service": "OST Soundbox API Gateway",
        "database_connected": db_pool is not None
    }


@app.get("/", tags=["System"])
async def root():
    """Root endpoint with service information."""
    return {
        "service": "OST Soundbox System API",
        "version": "2.0.0",
        "docs_url": "/docs"
    }
