// SANKET Module 1 API Service
// Bridges React frontend to Python ML System for Landslide Risk Prediction & Explainability.
// Provides transparent fallback to mockData when backend server is offline.

import apiClient from './apiClient.js';
import { getZone, getDistrict } from '../data/mockData.js';

export const module1Api = {
  /**
   * Check Module 1 ML Server Health
   */
  async checkHealth() {
    try {
      return await apiClient.get('/api/v1/module1/health', { timeoutMs: 2000 });
    } catch {
      return { status: 'offline', model_loaded: false, fallback_mode: true };
    }
  },

  /**
   * Check Satellite & DEM Credentials Status (NASA GPM/SMAP, Copernicus DEM)
   */
  async checkCredentialsStatus() {
    try {
      return await apiClient.get('/api/v1/module1/credentials-status', { timeoutMs: 3000 });
    } catch {
      return { status: 'offline', configured: false };
    }
  },

  /**
   * Get Live Aggregated Pan-India Dashboard Summary & KPIs
   */
  async getDashboardSummary() {
    try {
      return await apiClient.get('/api/v1/module1/dashboard-summary', { timeoutMs: 5000 });
    } catch {
      return {
        active_risk_zones: 12,
        active_risk_zones_breakdown: '4 Kedarnath/Chamoli · 3 Wayanad · 5 NER',
        avg_rainfall_24h: 42.8,
        areas_monitored: 248,
        critical_alerts_count: 3,
        updated_at: new Date().toISOString(),
        is_fallback: true,
      };
    }
  },

  /**
   * Get Live Point Environmental Telemetry (Rainfall, Soil, DEM, Temp, Wind)
   */
  async getEnvironment(lat, lon, district = null) {
    try {
      const q = district ? `?lat=${lat}&lon=${lon}&district=${encodeURIComponent(district)}` : `?lat=${lat}&lon=${lon}`;
      return await apiClient.get(`/api/v1/module1/environment${q}`, { timeoutMs: 4000 });
    } catch {
      return {
        latitude: lat,
        longitude: lon,
        risk_probability: 0.72,
        risk_level: 'warning',
        risk_score: 72,
        telemetry: {
          rainfall_24h: 38.5,
          rainfall_72h: 74.2,
          rainfall_7d: 112.0,
          soil_moisture: 0.38,
          temperature: 26.4,
          wind_speed: 13.5,
          elevation: 1250,
          slope: 28.5,
        },
        is_fallback: true,
      };
    }
  },

  /**
   * Predict Landslide Risk Probability & Classification
   * @param {Object} input - { latitude, longitude, rainfall_24h, rainfall_72h, rainfall_7d, soil_moisture, slope, elevation, twi, ndvi }
   */
  async predictRisk(input) {
    try {
      const response = await apiClient.post('/api/v1/module1/predict', input);
      return { ...response, is_mock: false };
    } catch {
      // Fallback calculation from mock heuristics if backend is unreachable
      const rf = (input.rainfall_24h || 0) + (input.rainfall_72h || 0) * 0.5;
      const slope = input.slope || 25;
      let prob = 0.15;
      if (rf > 120 && slope > 30) prob = 0.85;
      else if (rf > 80 && slope > 20) prob = 0.65;
      else if (rf > 40) prob = 0.40;

      let level = 'normal';
      if (prob >= 0.8) level = 'danger';
      else if (prob >= 0.6) level = 'warning';
      else if (prob >= 0.35) level = 'watch';

      return {
        risk_probability: prob,
        risk_level: level,
        is_mock: true,
        evaluated_at: new Date().toISOString(),
      };
    }
  },

  /**
   * Explain Risk Prediction using SHAP Feature Attributions
   * @param {string} zoneId - Zone identifier (e.g. 'noney-a')
   * @param {Object} input - Telemetry feature values
   */
  async explainRisk(zoneId, input = {}) {
    try {
      const response = await apiClient.post(`/api/v1/module1/explain?zone_id=${zoneId}`, input);
      return { ...response, is_mock: false };
    } catch {
      // Fallback: extract explanation from mockData ZONES
      const zone = getZone(zoneId);
      const factors = zone ? zone.aiAssessment : [
        { factor: 'Terrain Susceptibility', status: 'High' },
        { factor: 'Rainfall Trigger', status: 'High' },
        { factor: 'Soil Moisture', status: 'Elevated' },
        { factor: 'Vegetation', status: 'Reduced' },
        { factor: 'Historical Vulnerability', status: 'High' },
      ];

      return {
        zone_id: zoneId,
        risk_level: zone ? zone.hazard : 'warning',
        factors,
        is_mock: true,
        method: 'TreeSHAP (Mock Attribution Fallback)',
      };
    }
  },

  /**
   * Get Environmental & ML Summary for a District
   */
  async getDistrictAssessment(districtId) {
    const district = getDistrict(districtId);
    if (!district) return null;

    try {
      const rf = district.environment?.rainfall;
      const prediction = await this.predictRisk({
        latitude: 24.8, // Representative regional center
        longitude: 93.6,
        rainfall_24h: rf?.h24 || 35,
        rainfall_72h: rf?.h72 || 70,
        rainfall_7d: rf?.d7 || 110,
        soil_moisture: district.environment?.soilMoisture?.level === 'Saturated' ? 0.45 : 0.28,
        slope: district.environment?.terrain?.slope === 'STEEP' ? 35 : 18,
      });

      return {
        districtId,
        hazard: prediction.risk_level,
        probability: prediction.risk_probability,
        is_mock: prediction.is_mock,
      };
    } catch {
      return {
        districtId,
        hazard: district.hazard,
        probability: district.hazard === 'danger' ? 0.88 : district.hazard === 'warning' ? 0.65 : 0.25,
        is_mock: true,
      };
    }
  },

  /**
   * Get Live OpenStreetMap (OSM) Critical Infrastructure (Hospitals, Roads, Schools, Bridges)
   */
  async getInfrastructure(lat, lon, district = null, radiusKm = 6.0, forceRefresh = false) {
    try {
      const p = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        radius_km: radiusKm.toString(),
        force_refresh: forceRefresh ? 'true' : 'false',
      });
      if (district) p.append('district', district);
      return await apiClient.get(`/api/v1/module1/infrastructure?${p.toString()}`, { timeoutMs: 6000 });
    } catch (err) {
      console.warn('OSM Infrastructure fetch failed, using fallback:', err);
      return null;
    }
  },

  /**
   * Get Live Environmental Telemetry & ML Risk for ALL Monitored Districts
   */
  async getDistrictsLive() {
    try {
      return await apiClient.get('/api/v1/module1/districts-live', { timeoutMs: 15000 });
    } catch (err) {
      console.warn('Live districts fetch failed:', err);
      return null;
    }
  },
};

export default module1Api;

