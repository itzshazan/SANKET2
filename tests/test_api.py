import pytest
from fastapi.testclient import TestClient

from module1.api.main import app

client = TestClient(app)
API = "/api/v1/module1"
NONEY = {"latitude": 24.78, "longitude": 93.63}


def test_health_reports_model_loaded():
    body = client.get(f"{API}/health").json()
    assert body["status"] == "ok" and body["model_loaded"] is True


def test_predict_returns_valid_tier():
    r = client.post(f"{API}/predict", json={**NONEY, "zone_id": "noney-a"})
    assert r.status_code == 200
    body = r.json()
    assert 0.0 <= body["risk_probability"] <= 1.0
    assert body["risk_level"] in {"normal", "watch", "warning", "danger"}


def test_dry_steep_terrain_is_not_alarming():
    """Regression: the old model called steep, high-history districts 'danger' at ~4 mm of rain."""
    r = client.post(f"{API}/predict", json={**NONEY, "rainfall_24h": 3, "rainfall_72h": 6, "rainfall_7d": 30,
                                            "soil_moisture": 0.2, "slope": 45})
    assert r.json()["risk_level"] == "normal"


def test_extreme_rain_is_danger():
    r = client.post(f"{API}/predict", json={**NONEY, "rainfall_24h": 120, "rainfall_72h": 250, "rainfall_7d": 400,
                                            "soil_moisture": 0.45, "slope": 40})
    assert r.json()["risk_level"] == "danger"


def test_risk_rises_with_rainfall():
    def prob(rf72):
        return client.post(f"{API}/predict", json={**NONEY, "rainfall_24h": rf72 / 2.5, "rainfall_72h": rf72,
                                                   "rainfall_7d": rf72 * 1.6, "slope": 30}).json()["risk_probability"]
    assert prob(10) <= prob(80) <= prob(250)


def test_explain_is_model_based_and_sums_to_one():
    r = client.post(f"{API}/explain?zone_id=x", json={**NONEY, "rainfall_72h": 250, "rainfall_24h": 120, "slope": 40})
    body = r.json()
    assert "Shapley" in body["method"]
    assert body["factors"][0]["factor"] == "Rainfall Trigger"
    assert sum(f["weight"] for f in body["factors"]) == pytest.approx(1.0, abs=0.05)


def test_batch_predict_handles_optional_fields():
    """Regression: None values used to crash the model with a 500."""
    r = client.post(f"{API}/batch-predict", json={"instances": [NONEY, {**NONEY, "rainfall_72h": 200}]})
    assert r.status_code == 200 and r.json()["count"] == 2


def test_districts_live_and_dashboard_summary():
    d = client.get(f"{API}/districts-live").json()
    assert d["count"] >= 15 and d["is_live"] is False  # offline mode is reported honestly
    s = client.get(f"{API}/dashboard-summary").json()
    assert s["areas_monitored"] == 8


def test_backtest_escalates_before_event():
    steps = client.get(f"{API}/backtest/noney-2022").json()["timeline_steps"]
    assert steps[0]["predicted_level"] == "normal" and steps[-1]["predicted_level"] == "danger"


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
