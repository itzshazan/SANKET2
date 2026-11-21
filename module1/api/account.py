"""Account and admin endpoints (sign-in itself happens in the browser with Supabase)."""

import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..ml import predict as ml
from ..monitoring import service
from . import auth
from .auth import ROLES, STATUSES, User, require_admin, session_user

router = APIRouter(prefix="/api/v1/module1", tags=["Accounts & admin"])


@router.get("/auth/config")
def auth_config():
    """What the browser needs to talk to Supabase. Only the public (anon) key is ever returned."""
    s = auth.settings()
    return {"configured": auth.configured(), "supabase_url": s["url"] or None,
            "anon_key": s["anon"] or None, "roles": list(ROLES)}


@router.get("/me")
def me(user: User = Depends(auth.fresh_session_user)):
    # read fresh, so "Check now" sees an approval immediately (other endpoints use the 30 s cache)
    return user.public()


@router.post("/me/session", status_code=204)
def session_started(user: User = Depends(session_user)):
    """Called by the browser right after a sign-in, so the activity log shows who signed in."""
    auth.audit(user, "signed_in")


class AccessRequest(BaseModel):
    requested_role: str = Field(..., description="district_officer | field_officer")
    requested_districts: List[str] = []
    phone: Optional[str] = Field(None, max_length=30)
    full_name: Optional[str] = Field(None, max_length=120)


@router.post("/me/request")
def request_access(req: AccessRequest, user: User = Depends(session_user)):
    """A pending account (e.g. signed up with Google) says which role and districts it needs."""
    if user.status != "pending":
        raise HTTPException(400, "Only accounts waiting for approval can change their request")
    if req.requested_role not in ("district_officer", "field_officer"):
        raise HTTPException(400, "requested_role must be district_officer or field_officer")
    known = set(service.registry())
    bad = [d for d in req.requested_districts if d not in known]
    if bad:
        raise HTTPException(400, f"unknown districts: {', '.join(bad)}")
    body: Dict[str, Any] = {"requested_role": req.requested_role, "requested_districts": req.requested_districts,
                            "updated_at": datetime.now(timezone.utc).isoformat()}
    if req.phone is not None:
        body["phone"] = req.phone.strip() or None
    if req.full_name:
        body["full_name"] = req.full_name.strip()
    updated = auth.rest("PATCH", "/rest/v1/profiles", params={"id": f"eq.{user.id}"}, json=body,
                        headers={"Prefer": "return=representation"}).json()
    auth.forget_profile(user.id)
    auth.audit(user, "requested_access", user.email, {"role": req.requested_role, "districts": req.requested_districts})
    return updated[0] if updated else {}


# ---------------------------------------------------------------- admin: users
class UserChange(BaseModel):
    role: Optional[str] = Field(None, description="admin | district_officer | field_officer")
    districts: Optional[List[str]] = None
    status: Optional[str] = Field(None, description="pending | active | disabled")


def _auth_users() -> Dict[str, Dict[str, Any]]:
    out, page = {}, 1
    while True:
        data = auth.rest("GET", "/auth/v1/admin/users", params={"page": page, "per_page": 200}).json()
        users = data.get("users", []) if isinstance(data, dict) else (data or [])
        for u in users:
            out[u["id"]] = u
        if len(users) < 200:
            return out
        page += 1


@router.get("/admin/users")
def admin_users(admin: User = Depends(require_admin)):
    profiles = auth.rest("GET", "/rest/v1/profiles", params={"select": "*", "order": "created_at.desc"}).json()
    accounts = _auth_users()
    rows = []
    for p in profiles:
        a = accounts.get(p["id"], {})
        rows.append({**p, "email": a.get("email") or p.get("email"),
                     "email_confirmed": bool(a.get("email_confirmed_at")),
                     "last_sign_in_at": a.get("last_sign_in_at")})
    return {"users": rows}


@router.patch("/admin/users/{user_id}")
def admin_update_user(user_id: str, change: UserChange, admin: User = Depends(require_admin)):
    body: Dict[str, Any] = {}
    if change.role is not None:
        if change.role not in ROLES:
            raise HTTPException(400, f"role must be one of {', '.join(ROLES)}")
        body["role"] = change.role
    if change.status is not None:
        if change.status not in STATUSES:
            raise HTTPException(400, f"status must be one of {', '.join(STATUSES)}")
        body["status"] = change.status
    if change.districts is not None:
        known = set(service.registry())
        bad = [d for d in change.districts if d not in known]
        if bad:
            raise HTTPException(400, f"unknown districts: {', '.join(bad)}")
        body["districts"] = change.districts
    if not body:
        raise HTTPException(400, "nothing to change")
    if user_id == admin.id and (body.get("role", "admin") != "admin" or body.get("status", "active") != "active"):
        raise HTTPException(400, "You cannot remove your own admin access")

    current = auth.rest("GET", "/rest/v1/profiles", params={"id": f"eq.{user_id}", "select": "*"}).json()
    if not current:
        raise HTTPException(404, "User not found")
    target = current[0]
    if body.get("status") == "active" and not (body.get("role") or target.get("role")):
        raise HTTPException(400, "Choose a role before approving this account")
    if body.get("status") == "active" and target.get("status") != "active":
        body["approved_by"] = admin.id
        body["approved_at"] = datetime.now(timezone.utc).isoformat()
    body["updated_at"] = datetime.now(timezone.utc).isoformat()

    updated = auth.rest("PATCH", "/rest/v1/profiles", params={"id": f"eq.{user_id}"}, json=body,
                        headers={"Prefer": "return=representation"}).json()
    auth.forget_profile(user_id)
    action = {"active": "approved_user" if target.get("status") != "active" else "updated_user",
              "disabled": "disabled_user"}.get(body.get("status"), "updated_user")
    auth.audit(admin, action, target.get("email") or user_id,
               {k: v for k, v in body.items() if k in ("role", "districts", "status")})
    return updated[0] if updated else {}


# ---------------------------------------------------------------- admin: activity + system overview
@router.get("/admin/audit")
def admin_audit(limit: int = Query(100, ge=1, le=500), admin: User = Depends(require_admin)):
    return {"entries": auth.rest("GET", "/rest/v1/audit_log",
                                 params={"select": "*", "order": "at.desc", "limit": limit}).json()}


@router.get("/admin/overview")
def admin_overview(admin: User = Depends(require_admin)):
    profiles = auth.rest("GET", "/rest/v1/profiles", params={"select": "role,status"}).json()
    by_status = {s: sum(1 for p in profiles if p.get("status") == s) for s in STATUSES}
    by_role = {r: sum(1 for p in profiles if p.get("role") == r and p.get("status") == "active") for r in ROLES}

    from .records import DB_PATH
    records = {"field_reports": 0, "field_reports_24h": 0, "incidents": 0, "incidents_open": 0}
    if DB_PATH.exists():
        con = sqlite3.connect(DB_PATH)
        try:
            records["field_reports"] = con.execute("SELECT COUNT(*) FROM field_reports").fetchone()[0]
            records["field_reports_24h"] = con.execute(
                "SELECT COUNT(*) FROM field_reports WHERE created_at >= ?",
                (datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() - 86400, timezone.utc).isoformat(),)
            ).fetchone()[0]
            docs = [json.loads(r[0]) for r in con.execute("SELECT doc FROM incidents").fetchall()]
            records["incidents"] = len(docs)
            records["incidents_open"] = sum(1 for d in docs if (d.get("status") or "").lower() != "resolved")
        except sqlite3.Error:
            pass
        finally:
            con.close()

    from module3 import scene_model
    feeds = service.all_districts_live(force=False)
    weather: Dict[str, int] = {}
    districts = feeds.get("districts") or {}
    for d in (districts.values() if isinstance(districts, dict) else districts):   # keyed by district id
        k = d.get("weather_status", "unavailable")
        weather[k] = weather.get(k, 0) + 1
    return {
        "users": {"by_status": by_status, "active_by_role": by_role, "total": len(profiles)},
        "records": records,
        "system": {
            "districts_updated_at": feeds.get("updated_at"),
            "weather_status": weather,
            "confidence_model_loaded": ml.available(),
            "road_model_weights": scene_model.weights_present(),
            "copernicus_ndvi_configured": bool(os.getenv("COPERNICUS_CLIENT_ID")),
        },
    }
