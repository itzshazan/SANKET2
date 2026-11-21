import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env (Copernicus / NASA credentials) from the project root before anything reads them.
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env", override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .account import router as account_router
from .records import router as records_router
from .routes import router

app = FastAPI(
    title="SANKET Module 1 - Landslide Early Warning API",
    description=(
        "Live landslide early warning on real data: Open-Meteo hourly rainfall and soil moisture, "
        "Copernicus GLO-30 terrain, Sentinel-2 NDVI, OpenStreetMap infrastructure and published "
        "regional rainfall thresholds. Every value carries its source and status (live / stale / unavailable)."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Sites whose pages may call this API. Default "*" (any): requests carry a bearer token, not cookies.
# In production list only the frontend, e.g. SANKET_CORS_ORIGINS=https://sanket.vercel.app (comma-separated).
CORS_ORIGINS = [o.strip().rstrip("/") for o in (os.getenv("SANKET_CORS_ORIGINS") or "*").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(records_router)
app.include_router(account_router)


@app.get("/", tags=["Root"])
def root_info():
    return {
        "project": "SANKET - SIH 26001",
        "module": "Module 1 (Landslide early warning)",
        "docs": "/docs",
        "health": "/api/v1/module1/health",
        "districts_live": "/api/v1/module1/districts-live",
    }
