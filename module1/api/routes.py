"""FastAPI Route Handlers for Module 1."""

from datetime import datetime
from pathlib import Path
import threading
import time
from typing import Dict, Any, Optional, List

_cache_lock = threading.Lock()
from fastapi import APIRouter, HTTPException, Query
from .schemas import (
    PredictionRequest,
    PredictionResponse,
    ExplanationResponse,
    FactorAttribution,
    BatchPredictionRequest,
    BatchPredictionResponse,
    HealthResponse,
)
from ..inference.predictor import LandslidePredictor
from ..explainability.shap import TreeShapExplainer
from ..evaluation.backtesting import HistoricalEventBacktester
from ..ingestion.realtime_api import realtime_service
from ..ingestion.osm import osm_service

router = APIRouter(prefix="/api/v1/module1", tags=["Module 1: Landslide Risk Prediction"])

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODELS_DIR / "module1_model.pkl"

# Initialize predictor and explainer
predictor = LandslidePredictor(model_path=MODEL_PATH)
explainer = TreeShapExplainer(model=predictor.model)

backtester = HistoricalEventBacktester()

# Pan-India key monitoring hubs for nationwide aggregation
KEY_MONITORING_HUBS = [
    {"id": "wayanad", "name": "Wayanad", "state": "Kerala", "lat": 11.6854, "lon": 76.1320},
    {"id": "rudraprayag", "name": "Rudraprayag", "state": "Uttarakhand", "lat": 30.2844, "lon": 78.9811},
    {"id": "noney", "name": "Noney", "state": "Manipur", "lat": 24.7831, "lon": 93.6322},
    {"id": "mandi", "name": "Mandi", "state": "Himachal Pradesh", "lat": 31.7087, "lon": 76.9319},
    {"id": "chamoli", "name": "Chamoli", "state": "Uttarakhand", "lat": 30.5564, "lon": 79.5670},
    {"id": "raigad", "name": "Raigad", "state": "Maharashtra", "lat": 18.2346, "lon": 73.4442},
    {"id": "ramban", "name": "Ramban", "state": "Jammu & Kashmir", "lat": 33.2422, "lon": 75.2415},
    {"id": "nilgiris", "name": "Nilgiris", "state": "Tamil Nadu", "lat": 11.4102, "lon": 76.6950},
]

# Full set of all monitored districts (superset of KEY hubs + additional districts from frontend)
ALL_MONITORED_DISTRICTS = KEY_MONITORING_HUBS + [
    {"id": "idukki", "name": "Idukki", "state": "Kerala", "lat": 9.8494, "lon": 76.9723},
    {"id": "pune", "name": "Pune", "state": "Maharashtra", "lat": 19.1583, "lon": 73.6872},
    {"id": "tehri", "name": "Tehri Garhwal", "state": "Uttarakhand", "lat": 30.3800, "lon": 78.4800},
    {"id": "shimla", "name": "Shimla", "state": "Himachal Pradesh", "lat": 31.1048, "lon": 77.1734},
    {"id": "kullu", "name": "Kullu", "state": "Himachal Pradesh", "lat": 31.9579, "lon": 77.1095},
    {"id": "tamenglong", "name": "Tamenglong", "state": "Manipur", "lat": 24.9850, "lon": 93.4920},
    {"id": "east-sikkim", "name": "East Sikkim", "state": "Sikkim", "lat": 27.3389, "lon": 88.6065},
    {"id": "aizawl", "name": "Aizawl", "state": "Mizoram", "lat": 23.7271, "lon": 92.7176},
    {"id": "kohima", "name": "Kohima", "state": "Nagaland", "lat": 25.6751, "lon": 94.1086},
    {"id": "dima-hasao", "name": "Dima Hasao", "state": "Assam", "lat": 25.1830, "lon": 93.0210},
    {"id": "east-khasi-hills", "name": "East Khasi Hills", "state": "Meghalaya", "lat": 25.5788, "lon": 91.8933},
    {"id": "lower-dibang-valley", "name": "Lower Dibang Valley", "state": "Arunachal Pradesh", "lat": 28.1400, "lon": 95.8400},
    {"id": "khowai", "name": "Khowai", "state": "Tripura", "lat": 24.0600, "lon": 91.6000},
]

# Server-side cache for districts-live endpoint (5 min TTL)
_districts_live_cache: Dict[str, Any] = {}
_districts_live_cache_ts: float = 0.0
DISTRICTS_CACHE_TTL = 300  # 5 minutes


@router.get("/health", response_model=HealthResponse)
def health_check():
    """System health check and model loading verification."""
    return HealthResponse(
        status="ok",
        service="SANKET Module 1 — Landslide Risk Prediction",
        version="1.0.0",
        model_loaded=predictor.model is not None,
        fallback_mode=predictor.model is None,
    )


@router.get("/credentials-status")
def credentials_status():
    """Returns the operational and authentication status of NASA Earthdata, Copernicus DEM, and auxiliary APIs."""
    return realtime_service.get_credentials_status()


@router.get("/environment")
def get_environment_telemetry(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    district: Optional[str] = Query(None, description="Optional district name for ISRO atlas lookup"),
):
    """Returns live enriched satellite weather, DEM topography, and ML hazard evaluation for coordinates."""
    telemetry = realtime_service.fetch_live_environmental_telemetry(lat=lat, lon=lon, district_name=district)
    prob, level = predictor.predict(telemetry)

    return {
        "latitude": lat,
        "longitude": lon,
        "district": district,
        "risk_probability": round(prob, 3),
        "risk_level": level,
        "risk_score": int(round(prob * 100)),
        "telemetry": telemetry,
        "evaluated_at": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/dashboard-summary")
def get_dashboard_summary():
    """Aggregates live environmental metrics and AI hazard evaluations across pan-India monitoring hubs."""
    dist_data = get_districts_live()
    all_dist = dist_data.get("districts", {})

    hub_results = []
    total_rainfall = 0.0
    active_risk_count = 0
    critical_alerts = 0

    for hub in KEY_MONITORING_HUBS:
        d = all_dist.get(hub["id"])
        if d:
            prob = d.get("risk_probability", 0.0)
            level = d.get("risk_level", "normal")
            rf24 = d.get("rainfall_24h", 0.0)
            total_rainfall += rf24
            if level in ("danger", "warning"):
                active_risk_count += 1
            if level == "danger":
                critical_alerts += 1
            hub_results.append({
                **hub,
                **d
            })

    avg_rainfall = round(total_rainfall / max(1, len(hub_results)), 1) if hub_results else 0.0

    # Count risk breakdowns by region
    himalaya_risk = sum(1 for h in hub_results if h.get("risk_level") in ("danger", "warning") and h.get("state") in ("Uttarakhand", "Himachal Pradesh", "Jammu & Kashmir"))
    ghats_risk = sum(1 for h in hub_results if h.get("risk_level") in ("danger", "warning") and h.get("state") in ("Kerala", "Maharashtra", "Tamil Nadu"))
    ner_risk = sum(1 for h in hub_results if h.get("risk_level") in ("danger", "warning") and h.get("state") in ("Manipur", "Sikkim", "Assam", "Meghalaya", "Mizoram", "Nagaland", "Tripura", "Arunachal Pradesh"))

    return {
        "active_risk_zones": active_risk_count,
        "active_risk_zones_breakdown": f"{himalaya_risk} High Himalayas · {ghats_risk} Western Ghats · {ner_risk} NER",
        "avg_rainfall_24h": avg_rainfall,
        "areas_monitored": len(hub_results),
        "critical_alerts_count": critical_alerts,
        "hubs": hub_results,
        "is_live": True,
        "cached": dist_data.get("cached", False),
        "updated_at": dist_data.get("updated_at", datetime.utcnow().isoformat() + "Z"),
    }


@router.post("/predict", response_model=PredictionResponse)
def predict_risk(request: PredictionRequest):
    """Predicts continuous landslide risk probability and classifies into hazard tier.
    
    If telemetry features (rainfall, soil, slope) are omitted, automatically fetches
    and enriches with real-time satellite, weather, and DEM elevation data.
    """
    feature_dict = request.dict(exclude_none=True)

    # Auto-fetch live environmental telemetry for the coordinates
    live_env = realtime_service.fetch_live_environmental_telemetry(
        lat=request.latitude,
        lon=request.longitude,
    )

    # Merge: request values override auto-fetched values if explicitly supplied
    merged_features = {**live_env, **feature_dict}

    prob, level = predictor.predict(merged_features)

    # Core 10 V1 environmental features
    environment_summary = {
        "rainfall_24h": merged_features.get("rainfall_24h", 0.0),
        "rainfall_72h": merged_features.get("rainfall_72h", 0.0),
        "rainfall_7d": merged_features.get("rainfall_7d", 0.0),
        "soil_moisture": merged_features.get("soil_moisture", 0.25),
        "elevation": merged_features.get("elevation", 500.0),
        "slope": merged_features.get("slope", 20.0),
        "twi": merged_features.get("twi", 8.5),
        "ndvi": merged_features.get("ndvi", 0.65),
        "ndvi_change": merged_features.get("ndvi_change", -0.02),
        "historical_landslide_count": merged_features.get("historical_landslide_count", 1),
        "temperature": merged_features.get("temperature", 24.0),
        "wind_speed": merged_features.get("wind_speed", 12.0),
    }

    return PredictionResponse(
        risk_probability=prob,
        risk_level=level,
        evaluated_at=datetime.utcnow().isoformat() + "Z",
        model_version="1.0.0-xgb",
        zone_id=request.zone_id,
        is_mock=False,
        location={
            "latitude": request.latitude,
            "longitude": request.longitude,
            "zone_id": request.zone_id,
        },
        environment=environment_summary,
        data_source=merged_features.get("data_source", "hybrid_realtime"),
    )


@router.post("/explain", response_model=ExplanationResponse)
def explain_risk(request: PredictionRequest, zone_id: Optional[str] = Query(None)):
    """Computes TreeSHAP factor attributions explaining why the model assigned the given hazard level."""
    feature_dict = request.dict(exclude_none=True)
    live_env = realtime_service.fetch_live_environmental_telemetry(
        lat=request.latitude,
        lon=request.longitude,
    )
    merged_features = {**live_env, **feature_dict}

    prob, level = predictor.predict(merged_features)
    factors_raw = explainer.explain_instance(merged_features)

    factors = [FactorAttribution(**f) for f in factors_raw]

    return ExplanationResponse(
        zone_id=zone_id or request.zone_id,
        risk_level=level,
        risk_probability=prob,
        method="TreeSHAP",
        factors=factors,
    )


@router.post("/batch-predict", response_model=BatchPredictionResponse)
def batch_predict(request: BatchPredictionRequest):
    """Batch prediction over a list of coordinate/telemetry samples."""
    results = []
    for inst in request.instances:
        prob, level = predictor.predict(inst.dict())
        results.append(
            PredictionResponse(
                risk_probability=prob,
                risk_level=level,
                evaluated_at=datetime.utcnow().isoformat() + "Z",
                model_version="1.0.0-xgb",
                zone_id=inst.zone_id,
                is_mock=False,
            )
        )
    return BatchPredictionResponse(count=len(results), predictions=results)


@router.get("/backtest/noney-2022")
def run_noney_backtest():
    """Replays the 29 June 2022 Tupul (Noney, Manipur) railway landslide disaster sequence."""
    def p_func(rainfall_24h, rainfall_72h, soil_moisture, slope, elevation):
        f = {
            "rainfall_24h": rainfall_24h,
            "rainfall_72h": rainfall_72h,
            "soil_moisture": soil_moisture,
            "slope": slope,
            "elevation": elevation,
        }
        return predictor.predict(f)

    return backtester.backtest_noney_2022(p_func)


@router.get("/infrastructure")
def get_critical_infrastructure(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    district: Optional[str] = Query(None, description="District name"),
    radius_km: float = Query(6.0, description="Spatial search radius in kilometers"),
    force_refresh: bool = Query(False, description="Bypass cache and force live Overpass query"),
):
    """Fetches real-world critical infrastructure (hospitals, highways, schools/shelters, bridges) from OpenStreetMap Overpass."""
    return osm_service.fetch_infrastructure(
        lat=lat,
        lon=lon,
        radius_km=radius_km,
        district_name=district,
        force_refresh=force_refresh,
    )


@router.get("/districts-live")
def get_districts_live():
    """Returns live environmental telemetry + ML risk assessment for ALL monitored districts.

    Results are cached server-side for 5 minutes to avoid excessive Open-Meteo requests.
    """
    global _districts_live_cache, _districts_live_cache_ts

    now = time.time()
    if _districts_live_cache and (now - _districts_live_cache_ts) < DISTRICTS_CACHE_TTL:
        return {**_districts_live_cache, "cached": True}

    with _cache_lock:
        now = time.time()
        if _districts_live_cache and (now - _districts_live_cache_ts) < DISTRICTS_CACHE_TTL:
            return {**_districts_live_cache, "cached": True}

        districts_result: Dict[str, Any] = {}

        for dist in ALL_MONITORED_DISTRICTS:
            try:
                env = realtime_service.fetch_live_environmental_telemetry(
                    lat=dist["lat"],
                    lon=dist["lon"],
                    district_name=dist["name"],
                )
                prob, level = predictor.predict(env)

                districts_result[dist["id"]] = {
                    "name": dist["name"],
                    "state": dist["state"],
                    "lat": dist["lat"],
                    "lon": dist["lon"],
                    "risk_level": level,
                    "risk_probability": round(prob, 3),
                    "risk_score": int(round(prob * 100)),
                    "rainfall_24h": round(env.get("rainfall_24h", 0.0), 1),
                    "rainfall_72h": round(env.get("rainfall_72h", 0.0), 1),
                    "rainfall_7d": round(env.get("rainfall_7d", 0.0), 1),
                    "soil_moisture": round(env.get("soil_moisture", 0.0), 4),
                    "temperature": round(env.get("temperature", 0.0), 1),
                    "wind_speed": round(env.get("wind_speed", 0.0), 1),
                    "elevation": round(env.get("elevation", 0.0), 1),
                    "slope": round(env.get("slope", 0.0), 2),
                    "ndvi": round(env.get("ndvi", 0.0), 3),
                    "data_source": env.get("data_source", "hybrid_realtime"),
                }
            except Exception:
                pass

        result = {
            "districts": districts_result,
            "count": len(districts_result),
            "cache_ttl_seconds": DISTRICTS_CACHE_TTL,
            "is_live": True,
            "cached": False,
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }

        _districts_live_cache = result
        _districts_live_cache_ts = now

        return result
