import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env configuration from project root
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router
from .records import router as records_router

app = FastAPI(
    title="SANKET Module 1 — Landslide Risk Prediction API",
    description=(
        "Production AI/ML serving engine for landslide early warning in India's North Eastern Region (NER). "
        "Fuses GPM rainfall, SMAP soil moisture, Copernicus DEM topography, and Sentinel-2 NDVI."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for local Vite dev server and deployed frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # the API uses no cookies; "*" + credentials is rejected by browsers
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(records_router)


@app.get("/", tags=["Root"])
def root_info():
    return {
        "project": "SANKET — SIH 26001",
        "module": "Module 1 (Landslide Risk Prediction)",
        "docs": "/docs",
        "health": "/api/v1/module1/health",
        "predict": "/api/v1/module1/predict",
        "explain": "/api/v1/module1/explain",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("module1.api.main:app", host="0.0.0.0", port=8000, reload=True)
