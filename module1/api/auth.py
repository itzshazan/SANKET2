"""Sign-in for SANKET with Supabase (cloud).

Supabase handles accounts, passwords, email codes and password resets. SANKET keeps one row per user
in `public.profiles` (role, districts, approval status) and an `audit_log`, both in the same Supabase
database (see supabase/migrations/0001_sanket_auth.sql).

Every protected request carries the user's Supabase access token (Authorization: Bearer ...). It is
verified here, then the user's profile is read with the service-role key, which stays on this server
and is never sent to the browser.

Configuration (.env in the project root):
  SUPABASE_URL               https://<project>.supabase.co
  SUPABASE_ANON_KEY          public key, handed to the browser by /auth/config
  SUPABASE_SERVICE_ROLE_KEY  secret, server only
  SUPABASE_JWT_SECRET        only for projects still on the legacy HS256 shared secret
"""

import logging
import os
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx
import jwt
from fastapi import Depends, HTTPException, Request

log = logging.getLogger("sanket.auth")

ROLES = ("admin", "district_officer", "field_officer")
STATUSES = ("pending", "active", "disabled")
_PROFILE_TTL = 30.0


@dataclass
class User:
    id: str
    email: str = ""
    full_name: str = ""
    phone: Optional[str] = None
    role: Optional[str] = None
    status: str = "pending"
    districts: List[str] = field(default_factory=list)
    requested_role: Optional[str] = None
    requested_districts: List[str] = field(default_factory=list)

    def public(self) -> Dict[str, Any]:
        return {k: getattr(self, k) for k in ("id", "email", "full_name", "phone", "role", "status", "districts",
                                               "requested_role", "requested_districts")}


def settings() -> Dict[str, str]:
    return {
        "url": (os.getenv("SUPABASE_URL") or "").rstrip("/"),
        "anon": os.getenv("SUPABASE_ANON_KEY") or "",
        "service": os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "",
        "jwt_secret": os.getenv("SUPABASE_JWT_SECRET") or "",
    }


def configured() -> bool:
    s = settings()
    return bool(s["url"] and s["anon"] and s["service"])


# ---------------------------------------------------------------- token verification
_jwks_lock = threading.Lock()
_jwks: Dict[str, Any] = {}


def _jwks_client(url: str):
    with _jwks_lock:
        if url not in _jwks:
            _jwks[url] = jwt.PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json", cache_keys=True, lifespan=3600)
        return _jwks[url]


def verify_token(token: str) -> Dict[str, Any]:
    s = settings()
    try:
        alg = jwt.get_unverified_header(token).get("alg", "")
        if alg == "HS256":
            if not s["jwt_secret"]:
                raise HTTPException(401, "This project signs tokens with a shared secret: set SUPABASE_JWT_SECRET")
            key = s["jwt_secret"]
        else:
            key = _jwks_client(s["url"]).get_signing_key_from_jwt(token).key
        return jwt.decode(token, key, algorithms=[alg], audience="authenticated",
                          issuer=f"{s['url']}/auth/v1", options={"require": ["exp", "sub"]})
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired, please sign in again")
    except Exception as exc:  # bad signature, wrong issuer, malformed, JWKS unreachable
        log.info("token rejected: %s", exc)
        raise HTTPException(401, "Invalid session, please sign in again")


# ---------------------------------------------------------------- Supabase REST (service role)
def _headers() -> Dict[str, str]:
    key = settings()["service"]
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


_http: Optional[httpx.Client] = None
_http_lock = threading.Lock()


def _client() -> httpx.Client:
    """One pooled connection to Supabase, reused by every request: a fresh TLS handshake costs ~0.5 s."""
    global _http
    with _http_lock:
        if _http is None:
            _http = httpx.Client(timeout=15, limits=httpx.Limits(max_keepalive_connections=10, keepalive_expiry=120))
        return _http


def rest(method: str, path: str, **kw) -> httpx.Response:
    """Call Supabase with the service-role key (bypasses row-level security; server side only)."""
    r = _client().request(method, f"{settings()['url']}{path}", headers={**_headers(), **kw.pop("headers", {})}, **kw)
    if r.status_code >= 400:
        log.warning("supabase %s %s -> %s %s", method, path, r.status_code, r.text[:300])
        raise HTTPException(502, f"Supabase error {r.status_code}")
    return r


_profile_cache: Dict[str, Any] = {}
_cache_lock = threading.Lock()


def _to_user(row: Dict[str, Any], email: str = "") -> User:
    return User(id=row["id"], email=row.get("email") or email, full_name=row.get("full_name") or "",
                phone=row.get("phone"), role=row.get("role"), status=row.get("status") or "pending",
                districts=list(row.get("districts") or []), requested_role=row.get("requested_role"),
                requested_districts=list(row.get("requested_districts") or []))


def load_profile(uid: str, email: str = "") -> User:
    with _cache_lock:
        hit = _profile_cache.get(uid)
        if hit and time.time() - hit[0] < _PROFILE_TTL:
            return hit[1]
    rows = rest("GET", "/rest/v1/profiles", params={"id": f"eq.{uid}", "select": "*"}).json()
    if not rows:
        raise HTTPException(403, "No SANKET profile for this account (was the database migration run?)")
    user = _to_user(rows[0], email)
    with _cache_lock:
        _profile_cache[uid] = (time.time(), user)
    return user


def forget_profile(uid: str) -> None:
    with _cache_lock:
        _profile_cache.pop(uid, None)


def audit(actor: Optional[User], action: str, target: str = "", details: Optional[Dict[str, Any]] = None) -> None:
    """Best-effort activity log entry (never fails the request)."""
    if not configured():
        return
    try:
        rest("POST", "/rest/v1/audit_log", json={"actor": actor.id if actor else None,
                                                 "actor_email": actor.email if actor else None,
                                                 "action": action, "target": target, "details": details or {}},
             headers={"Prefer": "return=minimal"})
    except Exception as exc:
        log.warning("audit log write failed: %s", exc)


# ---------------------------------------------------------------- FastAPI dependencies
def _claims(request: Request) -> Dict[str, Any]:
    if not configured():
        raise HTTPException(503, "Sign-in is not set up on this server: add the Supabase keys to .env")
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(401, "Please sign in")
    return verify_token(header.split(" ", 1)[1].strip())


def session_user(request: Request) -> User:
    """Any signed-in user, including accounts still waiting for approval (profile cached for 30 s)."""
    claims = _claims(request)
    return load_profile(claims["sub"], claims.get("email", ""))


def fresh_session_user(request: Request) -> User:
    """Like session_user, but reads the profile from Supabase now (one read), so an approval shows at once."""
    claims = _claims(request)
    forget_profile(claims["sub"])
    return load_profile(claims["sub"], claims.get("email", ""))


def current_user(user: User = Depends(session_user)) -> User:
    """A signed-in user whose account an admin has approved."""
    if user.status == "pending":
        raise HTTPException(403, "Your account is waiting for an administrator to approve it")
    if user.status != "active" or user.role not in ROLES:
        raise HTTPException(403, "Your account is disabled")
    return user


def require(*roles: str):
    """Dependency factory: the user must have one of these roles (admins always pass)."""
    def check(user: User = Depends(current_user)) -> User:
        if user.role != "admin" and user.role not in roles:
            raise HTTPException(403, "Your role does not allow this action")
        return user
    return check


require_admin = require("admin")
