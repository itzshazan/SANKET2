"""Public historical endpoints must work without Supabase or an access token."""
from fastapi.testclient import TestClient
from module1.api.main import app
from module1.monitoring import analytics

API = '/api/v1/module1/history/events'

def test_history_events_are_public():
    response = TestClient(app).get(API)
    assert response.status_code == 200
    assert response.json()['events'] == analytics.list_events()
    assert response.json()['events']

def test_history_replay_is_public(monkeypatch):
    event = analytics.list_events()[0]
    replay = {**event, 'daily': [{'date': event['date'], 'rain_mm': 100}]}
    monkeypatch.setattr(analytics, 'replay_event', lambda event_id: replay)
    response = TestClient(app).get(f"{API}/{event['id']}")
    assert response.status_code == 200
    assert response.json() == replay

def test_unknown_history_event_is_not_found():
    response = TestClient(app).get(f'{API}/does-not-exist')
    assert response.status_code == 404
