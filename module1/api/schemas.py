"""Pydantic Request and Response Schemas for Module 1 API."""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    latitude: float = Field(..., ge=6.0, le=38.0, description="Latitude across India (Himalayas, Western Ghats, NER)")
    longitude: float = Field(..., ge=68.0, le=98.0, description="Longitude across India (Himalayas, Western Ghats, NER)")
    prediction_time: Optional[str] = Field(None, description="ISO 8601 prediction cutoff timestamp")
    rainfall_24h: Optional[float] = Field(None, ge=0.0, description="Preceding 24h rainfall in mm (auto-fetched if omitted)")
    rainfall_72h: Optional[float] = Field(None, ge=0.0, description="Preceding 72h rainfall in mm (auto-fetched if omitted)")
    rainfall_7d: Optional[float] = Field(None, ge=0.0, description="Preceding 7d cumulative rainfall in mm (auto-fetched if omitted)")
    max_rainfall_1h: Optional[float] = Field(None, ge=0.0, description="Peak 1-hour intensity in mm/h")
    soil_moisture: Optional[float] = Field(None, ge=0.0, le=1.0, description="Volumetric Water Content [0.0 - 1.0] (auto-fetched if omitted)")
    slope: Optional[float] = Field(None, ge=0.0, le=90.0, description="Terrain slope angle in degrees (auto-fetched if omitted)")
    elevation: Optional[float] = Field(None, ge=0.0, le=8000.0, description="Elevation above MSL in meters (auto-fetched if omitted)")
    aspect: Optional[float] = Field(None, ge=0.0, le=360.0, description="Slope aspect in degrees")
    curvature: Optional[float] = Field(None, description="Profile/plan curvature")
    twi: Optional[float] = Field(None, description="Topographic Wetness Index")
    flow_accumulation: Optional[float] = Field(None, description="Flow accumulation cells")
    ndvi: Optional[float] = Field(None, ge=-1.0, le=1.0, description="Current Sentinel-2 NDVI")
    ndvi_change: Optional[float] = Field(None, ge=-1.0, le=1.0, description="NDVI delta from baseline")
    historical_density: Optional[int] = Field(None, ge=0, description="Known prior landslides in 5km buffer")
    zone_id: Optional[str] = Field(None, description="Optional zone identifier for hysteresis state tracking")


class PredictionResponse(BaseModel):
    risk_probability: float = Field(..., description="Continuous landslide risk probability [0.0 - 1.0]")
    risk_level: str = Field(..., description="Operational hazard tier: NORMAL, WATCH, WARNING, DANGER")
    evaluated_at: str = Field(..., description="ISO 8601 evaluation timestamp")
    model_version: str = Field(..., description="Model artifact version string")
    zone_id: Optional[str] = None
    is_mock: bool = False
    location: Optional[Dict[str, Any]] = None
    environment: Optional[Dict[str, Any]] = None
    data_source: Optional[str] = None


class FactorAttribution(BaseModel):
    factor: str
    status: str
    weight: float
    detail: Optional[str] = None


class ExplanationResponse(BaseModel):
    zone_id: Optional[str] = None
    risk_level: str
    risk_probability: float
    method: str = "TreeSHAP"
    factors: List[FactorAttribution]


class BatchPredictionRequest(BaseModel):
    instances: List[PredictionRequest]


class BatchPredictionResponse(BaseModel):
    count: int
    predictions: List[PredictionResponse]


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    model_loaded: bool
    fallback_mode: bool
