"""FastAPI routes for Module 1 (live monitoring on real data)."""

import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from ..inference import threshold_model as tm
from ..ingestion.osm import osm_service
from ..ml import predict as ml
from ..monitoring import analytics, hotspots, service
from ..sources import sentinel2
from .auth import current_user
from module3 import service as road_blockage

router = APIRouter(prefix="/api/v1/module1", tags=["Module 1: Landslide early warning"])


class PointRequest(BaseModel):
    latitude: float = Field(..., ge=6.0, le=38.0)
    longitude: float = Field(..., ge=68.0, le=98.0)
    zone_id: Optional[str] = Field(None, description="Monitoring point id, enables alert hysteresis")


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "SANKET Module 1 - Landslide early warning",
        "version": "2.0.0",
        "model": tm.MODEL_NAME,
        "trained_model_loaded": ml.available(),
        "note": ("Hazard LEVEL comes from published rainfall thresholds; landslide CONFIDENCE comes from a model "
                 "trained on NASA catalogue events + ERA5 (see /model)." if ml.available() else
                 "No trained model yet: hazard level comes from published rainfall thresholds."),
        "monitored_districts": len(service.registry()),
    }


@router.get("/model")
def model_card():
    """Model card of the trained landslide-confidence model: data, features, honest evaluation."""
    c = ml.card()
    if not c:
        raise HTTPException(status_code=404, detail="No trained model. Run: python -m module1.ml.train")
    return c


@router.get("/thresholds")
def thresholds():
    return {"levels": tm.CONFIG["levels"], "durations_hours": tm.CONFIG["durations_hours"],
            "terrain_gate": tm.CONFIG.get("terrain_gate"),
            "regions": {rid: tm.region_info(rid) for rid in tm.CONFIG["regions"]}}


@router.get("/data-sources")
def data_sources():
    """What each input really comes from, and whether its credentials are present."""
    nasa = bool(os.getenv("NASA_EARTHDATA_TOKEN", "").strip())
    return {
        "rainfall_soil_temperature_wind": {"source": "ECMWF IFS 0.25° via Open-Meteo (hourly; same model family as the ERA5 training data)", "key_needed": False,
                                           "fallback": "last real reading up to 48 h old, flagged stale"},
        "terrain": {"source": "Copernicus DEM GLO-30 on AWS Open Data", "key_needed": False,
                    "fallback": "Open-Meteo elevation (GLO-90), elevation only"},
        "ndvi": {"source": "Sentinel-2 L2A via Copernicus Data Space Statistical API",
                 "configured": sentinel2.configured(), "fallback": "last real value, flagged stale"},
        "history_rainfall": {"source": "ERA5 reanalysis via Open-Meteo archive API", "key_needed": False},
        "infrastructure": {"source": "OpenStreetMap Overpass", "key_needed": False,
                           "fallback": "last real Overpass response, flagged stale"},
        "landslide_inventory": {"source": "file import (module1/data/raw/landslide/)", **service.inventory.summary()},
        "hotspots": {"source": "GSI susceptibility file import, else Copernicus DEM steep-terrain proxy"},
        "nasa_earthdata_token_present": nasa,
        "nasa_note": "NASA GPM IMERG is not used for live rain: its point time-series service returned 503 when tested.",
    }


@router.get("/districts")
def districts():
    hs = hotspots.load()
    return {"districts": [{**d, "region_threshold": tm.region_info(tm.region_for_state(d["state"]))["label"],
                           "hotspot_source": hs[d["id"]]["source"],
                           "hotspots": [{k: p[k] for k in ("id", "lat", "lon") if k in p} for p in hs[d["id"]]["points"]]}
                          for d in service.registry().values()]}


@router.get("/districts-live")
def districts_live(force_refresh: bool = Query(False)):
    return service.all_districts_live(force=force_refresh)


@router.get("/districts/{district_id}", dependencies=[Depends(current_user)])
def district_detail(district_id: str):
    if district_id not in service.registry():
        raise HTTPException(status_code=404, detail="Unknown district")
    return service.assess_district(district_id, detail=True)


@router.get("/dashboard-summary")
def dashboard_summary():
    live = service.all_districts_live()
    ds = live["districts"].values()
    by_region = {}
    for d in ds:
        if d["level"] in ("warning", "danger"):
            by_region[d["region"]] = by_region.get(d["region"], 0) + 1
    rains = [d["weather"]["rain_mm"]["24"] for d in ds
             if d.get("weather", {}).get("rain_mm", {}).get("24") is not None]
    return {
        "areas_monitored": len(live["districts"]),
        "hotspots_monitored": sum(len(d.get("hotspots", [])) for d in ds),
        "counts": live["counts"],
        "active_risk_zones": live["counts"]["warning"] + live["counts"]["danger"],
        "active_risk_by_region": by_region,
        "critical_count": live["counts"]["danger"],
        "avg_rainfall_24h": round(sum(rains) / len(rains), 1) if rains else None,
        "districts_with_rain_data": len(rains),
        "updated_at": live["updated_at"], "cached": live["cached"], "model": live["model"],
    }


@router.get("/environment", dependencies=[Depends(current_user)])
def environment(lat: float = Query(...), lon: float = Query(...)):
    """Full real telemetry + threshold evaluation for any point (terrain and NDVI included)."""
    return service.assess_point(lat, lon, with_terrain=True, with_ndvi=True)


@router.post("/predict", dependencies=[Depends(current_user)])
def predict(req: PointRequest):
    """Threshold evaluation for a point (rain + terrain, no NDVI: faster for map clicks)."""
    return service.assess_point(req.latitude, req.longitude, key=req.zone_id, with_terrain=True)


@router.get("/timeseries", dependencies=[Depends(current_user)])
def timeseries(lat: float = Query(...), lon: float = Query(...), days: int = Query(14, ge=3, le=30),
               state: Optional[str] = Query(None)):
    if state is None:
        state, _ = service.geo.locate(lat, lon)
    return analytics.recent_series(lat, lon, state, days)


@router.get("/history/events", dependencies=[Depends(current_user)])
def history_events():
    return {"events": analytics.list_events(), "source": "ERA5 reanalysis via Open-Meteo archive API"}


@router.get("/history/events/{event_id}", dependencies=[Depends(current_user)])
def history_event(event_id: str):
    try:
        return analytics.replay_event(event_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown event")
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"ERA5 rainfall unavailable: {exc}")


@router.get("/infrastructure", dependencies=[Depends(current_user)])
def infrastructure(lat: float = Query(...), lon: float = Query(...), district: Optional[str] = Query(None),
                   radius_km: float = Query(6.0, ge=0.5, le=25), force_refresh: bool = Query(False)):
    return osm_service.fetch_infrastructure(lat=lat, lon=lon, radius_km=radius_km,
                                            district_name=district, force_refresh=force_refresh)


@router.get("/time")
def server_time():
    return {"utc": datetime.now(timezone.utc).isoformat()}


# --- Module 3: road blockage from a photo (experimental, see module3/service.py) ---------------
@router.get("/road-blockage/model")
def road_blockage_model():
    return road_blockage.model_info()


@router.post("/road-blockage", dependencies=[Depends(current_user)])
async def road_blockage_analyze(file: UploadFile = File(...)):
    data = await file.read(road_blockage.MAX_BYTES + 1)
    try:
        return await run_in_threadpool(road_blockage.analyze, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
