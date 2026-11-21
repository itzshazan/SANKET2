"""Tests for the threshold rule, the honest fallback chain and the API surface.

Network sources are replaced by stubs here so the tests are deterministic; the stubs only
exercise arithmetic and fallback logic; they are never served to users.
"""
import pytest
from fastapi.testclient import TestClient

from module1.api.main import app
from module1.inference import threshold_model as tm
from module1.monitoring import geo, service
from module1.sources import openmeteo
from module1.sources.http import SourceError

client = TestClient(app)
API = "/api/v1/module1"


# --------------------------------------------------------------------------- threshold rule
def test_published_threshold_values():
    # Abraham et al. 2019, Idukki: I = 0.9 D^-0.16  ->  24 h total = 0.9 * 24^0.84 = 12.98 mm
    assert tm.threshold_mm("kerala_western_ghats", 24) == pytest.approx(12.98, abs=0.05)
    # Kanungo & Sharma 2014, Garhwal: I = 1.82 D^-0.23
    assert tm.threshold_mm("uttarakhand_himalaya", 72) == pytest.approx(1.82 * 72 ** 0.77, rel=1e-6)
    # ED threshold for the NE is only valid above 24 h
    assert tm.threshold_mm("northeast_himalaya", 24) is None
    assert tm.threshold_mm("northeast_himalaya", 48) == pytest.approx(-11.10 + 0.62 * 48)


def test_dry_period_is_normal_and_heavy_rain_escalates():
    dry = tm.evaluate([0.0] * 240, "kerala_western_ghats")
    assert dry["level"] == "normal" and dry["ratio"] == 0
    wet = tm.evaluate([0.0] * 216 + [5.0] * 24, "kerala_western_ghats")   # 120 mm in 24 h
    assert wet["level"] == "danger"
    assert wet["governing_window"]["hours"] in (24, 48)


def test_dry_spell_has_no_governing_window():
    ev = tm.evaluate([0.0] * 240, "global_default")
    assert ev["level"] == "normal" and ev["ratio"] == 0 and ev["governing_window"] is None
    assert "no rain" in ev["reason"]


def test_terrain_gate_only_switches_off_flat_ground():
    from module1.monitoring.service import _apply_terrain_gate
    cut = tm.CONFIG["terrain_gate"]["min_steepest_slope_1km_deg"]
    flat = {"level": "danger", "ratio": 6.0}
    _apply_terrain_gate(flat, {"steepest_slope_1km_deg": cut - 5})
    assert flat["level"] == "normal" and flat["rain_level"] == "danger" and flat["terrain_gate"]["applicable"] is False
    hill = {"level": "danger", "ratio": 6.0}
    _apply_terrain_gate(hill, {"steepest_slope_1km_deg": cut + 20})
    assert hill["level"] == "danger" and hill["terrain_gate"]["applicable"] is True
    unknown = {"level": "danger", "ratio": 6.0}
    _apply_terrain_gate(unknown, {})          # no terrain data: never silently relax the warning
    assert unknown["level"] == "danger" and "terrain_gate" not in unknown


def test_short_history_is_unknown_not_normal():
    assert tm.evaluate([1.0] * 5, "kerala_western_ghats")["level"] == "unknown"


def test_hysteresis_holds_level_just_below_boundary():
    lv = tm.CONFIG["levels"]
    assert tm.level_for_ratio(lv["warning"] * 0.95, previous="warning") == "warning"
    assert tm.level_for_ratio(lv["warning"] * 0.5, previous="warning") == "watch"


def test_state_lookup_from_real_boundaries():
    assert geo.locate(11.6854, 76.1320) == ("Kerala", "Wayanad")
    assert geo.locate(24.7831, 93.6322)[0] == "Manipur"
    assert geo.locate(10.0, 72.0) == (None, None)   # Arabian Sea


# --------------------------------------------------------------------------- fallback chain
def test_weather_failure_without_history_is_unavailable(monkeypatch):
    def boom(points, timeout=12.0):
        raise SourceError("network down")
    monkeypatch.setattr(openmeteo, "fetch_live", boom)
    res = service.assess_point(12.3456, 75.4321, state="Kerala", with_terrain=False)
    assert res["weather"]["status"] == "unavailable"
    assert res["evaluation"]["level"] == "unknown"          # never a made-up level


def test_weather_failure_serves_last_real_reading_as_stale(monkeypatch):
    reading = {"hourly": {"time": [f"2026-01-01T{h:02d}:00" for h in range(24)] * 10,
                          "precipitation": [0.0] * 240, "soil_moisture_9_to_27cm": [0.3] * 240},
               "fetched_at": "2026-01-01T00:00:00+00:00", "source": openmeteo.LIVE_SOURCE}
    monkeypatch.setattr(openmeteo, "fetch_live", lambda points, timeout=12.0: [reading])
    service.weather_for([(13.1, 75.1)])                      # stores the reading
    monkeypatch.setattr(openmeteo, "fetch_live", lambda points, timeout=12.0: (_ for _ in ()).throw(SourceError("down")))
    w = service.weather_for([(13.1, 75.1)])[0]
    assert w["status"] == "stale" and w["hourly"]["precipitation"] == [0.0] * 240


# --------------------------------------------------------------------------- model features
def test_weather_features_windows_and_soil():
    from module1.ml import features as F
    h = {"precipitation": [0.0] * 216 + [2.0] * 24, "soil_moisture_7_to_28cm": [0.30] * 168 + [0.40] * 72,
         "soil_moisture_28_to_100cm": [0.35] * 240, "temperature_2m": [20.0] * 240, "wind_speed_10m": [5.0] * 240}
    f = F.weather_features(h)
    assert f["rain_24h"] == 48.0 and f["rain_1h"] == 2.0 and f["rain_240h"] == 48.0
    assert f["max_hourly_rain_24h"] == 2.0
    assert f["soil_7_28"] == 0.40 and f["soil_7_28_change_72h"] == pytest.approx(0.10)
    assert F.weather_features({"precipitation": [0.0] * 100}) is None      # too short -> no guess


def test_terrain_features_flat_vs_steep():
    from module1.ml import features as F
    flat = F.terrain_features([312.0, 312.0, 313.0], 22.76)
    steep = F.terrain_features([900.0, 1300.0, 900.0], 11.6)
    assert flat["gradient_550m_deg"] < 1 and steep["gradient_550m_deg"] > 30
    assert steep["relief_550m_m"] == 400.0


# --------------------------------------------------------------------------- inventory
def test_inventory_counts_gsi_and_nasa_and_skips_test_rows():
    import json
    from module1.monitoring import inventory as inv
    d = inv.INVENTORY_DIR
    (d / "gsi.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": {"type": "Point", "coordinates": [76.10, 11.60]},
         "properties": {"SLIDE_NO": "KER/WAY/2018/1", "SLIDE_NAME": "A", "TRIGGERING": "Rainfall", "INITIATION": 0}},
        {"type": "Feature", "geometry": {"type": "Point", "coordinates": [77.50, 12.50]},
         "properties": {"SLIDE_NO": "KAR/X/2010/2", "SLIDE_NAME": "far away"}}]}), encoding="utf-8")
    (d / "nasa.csv").write_text(
        "event_date,event_title,landslide_category,landslide_trigger,event_import_source,latitude,longitude\n"
        "08/01/2015 12:00:00 AM,B,landslide,downpour,glc,11.61,76.11\n"
        "08/01/2015 12:00:00 AM,T,landslide,downpour,test,11.61,76.11\n"
        "01/01/2016 12:00:00 AM,S,snow_avalanche,snowfall_snowmelt,glc,11.61,76.11\n", encoding="utf-8")
    inv.reload()
    r = inv.nearby_count(11.605, 76.105)
    assert r["count"] == 2
    assert r["by_source"] == {inv.GSI_LABEL: 1, inv.NASA_LABEL: 1}
    assert r["latest_year"] == 2018
    for f in ("gsi.geojson", "nasa.csv"):
        (d / f).unlink()
    inv.reload()
    assert inv.nearby_count(11.6, 76.1)["status"] == "unavailable"


# --------------------------------------------------------------------------- API surface
def test_health_is_honest_about_the_model():
    body = client.get(f"{API}/health").json()
    assert body["status"] == "ok" and isinstance(body["trained_model_loaded"], bool)
    card = client.get(f"{API}/model")
    if body["trained_model_loaded"]:      # a trained model must come with its evaluation
        ev = card.json()["evaluation"]["time_split"]
        assert ev["test"] and ev["train"] and 0.5 <= ev["model"]["roc_auc"] <= 1.0
    else:
        assert card.status_code == 404


def test_thresholds_have_citations():
    regions = client.get(f"{API}/thresholds").json()["regions"]
    assert all(r["citation"] for r in regions.values())


def test_every_district_has_hotspots():
    ds = client.get(f"{API}/districts").json()["districts"]
    assert len(ds) == 21 and all(len(d["hotspots"]) >= 1 for d in ds)


def test_field_report_roundtrip():
    created = client.post(f"{API}/field-reports", json={"location": "Noney town centre", "type": "Crack"})
    assert created.status_code == 201
    assert any(r["id"] == created.json()["id"] for r in client.get(f"{API}/field-reports").json())
    assert client.post(f"{API}/field-reports", json={"location": "", "type": "x"}).status_code == 422


def test_incident_create_patch_list():
    client.post(f"{API}/incidents", json={"id": "t-1", "status": "active"})
    assert client.patch(f"{API}/incidents/t-1", json={"status": "resolved"}).json()["status"] == "resolved"
    assert client.patch(f"{API}/incidents/missing", json={}).status_code == 404
    assert any(i["id"] == "t-1" for i in client.get(f"{API}/incidents").json())


# --- Module 3: road blockage from a photo -------------------------------------------------------
from pathlib import Path as _P
_SAMPLES = _P(__file__).resolve().parent.parent / "web" / "public" / "module3-samples"
_needs_weights = pytest.mark.skipif(
    not (_P(__file__).resolve().parent.parent / "module3/saved_models/upernet_convnext_tiny_ade20k/model.safetensors").exists(),
    reason="run python -m module3.download_weights")


@_needs_weights
def test_road_blockage_model_info_and_validation():
    info = TestClient(app).get("/api/v1/module1/road-blockage/model").json()
    assert info["available"] is True
    assert "ADE20K" in info["model"]["trained_on"]
    assert info["validation"]["summary"]["blocked_total"] >= 1


@_needs_weights
def test_road_blockage_detects_a_real_landslide_and_rejects_non_images():
    client = TestClient(app)
    r = client.post("/api/v1/module1/road-blockage",
                    files={"file": ("girdu.jpg", (_SAMPLES / "girdu.jpg").read_bytes(), "image/jpeg")}).json()
    assert r["status"] == "ok" and r["blockage_percentage"] >= 50
    assert r["severity"] in ("Severe", "Critical") and r["overlay"].startswith("data:image/jpeg;base64,")
    clear = client.post("/api/v1/module1/road-blockage",
                        files={"file": ("lahaul.jpg", (_SAMPLES / "clear_lahaul.jpg").read_bytes(), "image/jpeg")}).json()
    assert clear["status"] == "ok" and clear["blockage_percentage"] < 10
    bad = client.post("/api/v1/module1/road-blockage", files={"file": ("x.txt", b"not an image", "text/plain")})
    assert bad.status_code == 400


# --- Sign-in and permissions (Supabase tokens) ----------------------------------------------------
import time as _time

import jwt as _jwt

_URL, _SECRET = "https://example-project.supabase.co", "test-secret-test-secret-test-secret-123456"
_PROFILES = {
    "u-officer": {"id": "u-officer", "email": "officer@test", "role": "district_officer", "status": "active", "districts": ["wayanad"]},
    "u-field": {"id": "u-field", "email": "field@test", "role": "field_officer", "status": "active", "districts": []},
    "u-pending": {"id": "u-pending", "email": "new@test", "role": None, "status": "pending", "districts": []},
    "u-admin": {"id": "u-admin", "email": "boss@test", "role": "admin", "status": "active", "districts": []},
}


class _Resp:
    def __init__(self, data):
        self._data = data

    def json(self):
        return self._data


@pytest.fixture
def supabase_stub(monkeypatch):
    from module1.api import auth
    for k, v in {"SUPABASE_URL": _URL, "SUPABASE_ANON_KEY": "anon", "SUPABASE_SERVICE_ROLE_KEY": "service",
                 "SUPABASE_JWT_SECRET": _SECRET}.items():
        monkeypatch.setenv(k, v)

    def fake_rest(method, path, **kw):
        if path == "/rest/v1/profiles" and method == "GET":
            uid = kw.get("params", {}).get("id", "eq.").split("eq.", 1)[1]
            return _Resp([_PROFILES[uid]] if uid in _PROFILES else [])
        if path == "/rest/v1/profiles" and method == "PATCH":
            return _Resp([{"id": "x", **kw.get("json", {})}])
        return _Resp({})
    monkeypatch.setattr(auth, "rest", fake_rest)
    auth._profile_cache.clear()


def _token(uid, secret=_SECRET, exp_in=600):
    now = int(_time.time())
    return _jwt.encode({"sub": uid, "email": _PROFILES.get(uid, {}).get("email", ""), "aud": "authenticated",
                        "iss": f"{_URL}/auth/v1", "iat": now, "exp": now + exp_in}, secret, algorithm="HS256")


def _h(uid, **kw):
    return {"Authorization": f"Bearer {_token(uid, **kw)}"}


@pytest.mark.real_auth
def test_protected_endpoint_without_supabase_setup_says_so(monkeypatch):
    for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
        monkeypatch.setenv(k, "")
    client = TestClient(app)
    assert client.get("/api/v1/module1/auth/config").json()["configured"] is False
    assert client.get("/api/v1/module1/incidents").status_code == 503
    assert client.get("/api/v1/module1/thresholds").status_code == 200                # public data stays public


@pytest.mark.real_auth
def test_tokens_are_checked(supabase_stub):
    client = TestClient(app)
    cfg = client.get("/api/v1/module1/auth/config").json()
    assert cfg["configured"] is True and cfg["anon_key"] == "anon" and "service" not in str(cfg)
    assert client.get("/api/v1/module1/incidents").status_code == 401
    assert client.get("/api/v1/module1/incidents", headers=_h("u-officer", secret="wrong-secret-wrong-secret-0123456789")).status_code == 401
    assert client.get("/api/v1/module1/incidents", headers=_h("u-officer", exp_in=-10)).status_code == 401
    assert client.get("/api/v1/module1/incidents", headers=_h("u-officer")).status_code == 200


@pytest.mark.real_auth
def test_pending_account_can_only_see_itself(supabase_stub):
    client = TestClient(app)
    me = client.get("/api/v1/module1/me", headers=_h("u-pending"))
    assert me.status_code == 200 and me.json()["status"] == "pending"
    r = client.get("/api/v1/module1/incidents", headers=_h("u-pending"))
    assert r.status_code == 403 and "approve" in r.json()["detail"]


@pytest.mark.real_auth
def test_roles_are_enforced(supabase_stub):
    client = TestClient(app)
    report = {"location": "km 12, NH-766", "type": "Crack", "description": "crack in retaining wall"}
    made = client.post("/api/v1/module1/field-reports", json=report, headers=_h("u-field"))
    assert made.status_code == 201 and made.json()["created_by"] == "field@test"
    assert client.post("/api/v1/module1/incidents", json={"title": "x"}, headers=_h("u-field")).status_code == 403
    assert client.get("/api/v1/module1/field-reports", headers=_h("u-field")).status_code == 403
    assert client.get("/api/v1/module1/admin/users", headers=_h("u-officer")).status_code == 403
    assert client.post("/api/v1/module1/incidents", json={"title": "Slip on NH-766"}, headers=_h("u-officer")).status_code == 201


@pytest.mark.real_auth
def test_admin_cannot_lock_themselves_out(supabase_stub):
    client = TestClient(app)
    assert client.patch("/api/v1/module1/admin/users/u-admin", json={"role": "field_officer"}, headers=_h("u-admin")).status_code == 400
    ok = client.patch("/api/v1/module1/admin/users/u-pending", json={"role": "field_officer", "status": "active"}, headers=_h("u-admin"))
    assert ok.status_code == 200 and ok.json()["status"] == "active"


@pytest.mark.real_auth
def test_pending_account_can_request_a_role(supabase_stub):
    client = TestClient(app)
    ok = client.post("/api/v1/module1/me/request", headers=_h("u-pending"),
                     json={"requested_role": "district_officer", "requested_districts": ["wayanad"]})
    assert ok.status_code == 200 and ok.json()["requested_role"] == "district_officer"
    assert client.post("/api/v1/module1/me/request", headers=_h("u-officer"),
                       json={"requested_role": "field_officer"}).status_code == 400   # already approved
    assert client.post("/api/v1/module1/me/request", headers=_h("u-pending"),
                       json={"requested_role": "admin"}).status_code == 400           # cannot ask for admin


def test_admin_overview_counts_users_and_live_feeds(monkeypatch):
    """The live feed keys districts by id (a dict, not a list); the admin summary must read it that way."""
    from module1.api import auth
    from module1.monitoring import service
    monkeypatch.setattr(auth, "rest", lambda method, path, **kw: _Resp(
        [{"role": "admin", "status": "active"}, {"role": None, "status": "pending"}]))
    monkeypatch.setattr(service, "all_districts_live", lambda force=False: {
        "updated_at": "2026-11-21T07:00:00Z",
        "districts": {"wayanad": {"id": "wayanad", "weather_status": "live"},
                      "idukki": {"id": "idukki", "weather_status": "stale"}}})
    r = TestClient(app).get("/api/v1/module1/admin/overview")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["users"]["by_status"]["pending"] == 1 and body["users"]["active_by_role"]["admin"] == 1
    assert body["system"]["weather_status"] == {"live": 1, "stale": 1}
