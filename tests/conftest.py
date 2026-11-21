"""Test setup: throw-away database and cache directory so tests never touch real state."""
import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="sanket_test_")
os.environ["SANKET_DB_PATH"] = os.path.join(_tmp, "test.db")
os.environ["SANKET_CACHE_DIR"] = os.path.join(_tmp, "cache")
os.environ["SANKET_INVENTORY_DIR"] = os.path.join(_tmp, "inventory")
os.makedirs(os.environ["SANKET_INVENTORY_DIR"], exist_ok=True)

# API tests run as a signed-in admin (the Supabase sign-in is replaced inside the test process), so
# they never contact Supabase. Tests marked @pytest.mark.real_auth exercise the real token checks.
import pytest  # noqa: E402


def pytest_configure(config):
    config.addinivalue_line("markers", "real_auth: run without the signed-in-admin override")


@pytest.fixture(autouse=True)
def _signed_in_admin(request, monkeypatch):
    from module1.api import auth
    from module1.api.main import app

    deps = (auth.session_user, auth.fresh_session_user)
    if request.node.get_closest_marker("real_auth"):
        for d in deps:
            app.dependency_overrides.pop(d, None)
        yield
        return
    monkeypatch.setattr(auth, "audit", lambda *a, **k: None)
    for d in deps:
        app.dependency_overrides[d] = lambda: auth.User(
            id="test-admin", email="admin@test.local", role="admin", status="active")
    yield
    for d in deps:
        app.dependency_overrides.pop(d, None)
