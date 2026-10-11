"""Persistent field reports + incidents (SQLite, stdlib only, no setup).

Field officers POST reports; district officers read them and manage incidents.
The database file is created on first use at module1/data/sanket.db
(override with SANKET_DB_PATH). It is git-ignored.
"""

import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/module1", tags=["Field reports & incidents"])

DB_PATH = Path(os.getenv("SANKET_DB_PATH") or Path(__file__).resolve().parent.parent / "data" / "sanket.db")
_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS field_reports (
            id TEXT PRIMARY KEY, location TEXT NOT NULL, type TEXT NOT NULL,
            description TEXT, gps TEXT, has_photo INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Submitted', submitted_at TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY, doc TEXT NOT NULL, created_at TEXT NOT NULL);
        """
    )
    return con


class FieldReportIn(BaseModel):
    location: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., min_length=1, max_length=60)
    description: Optional[str] = Field("", max_length=2000)
    gps: Optional[str] = Field(None, max_length=80)
    has_photo: bool = False
    submitted_at: Optional[str] = Field(None, description="Client capture time (ISO 8601), for offline-queued reports")


class FieldReportOut(FieldReportIn):
    id: str
    status: str = "Submitted"


@router.get("/field-reports", response_model=List[FieldReportOut])
def list_field_reports(limit: int = Query(100, ge=1, le=500)):
    with _lock, _conn() as con:
        rows = con.execute("SELECT * FROM field_reports ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    return [
        FieldReportOut(id=r["id"], location=r["location"], type=r["type"], description=r["description"],
                       gps=r["gps"], has_photo=bool(r["has_photo"]), status=r["status"], submitted_at=r["submitted_at"])
        for r in rows
    ]


@router.post("/field-reports", response_model=FieldReportOut, status_code=201)
def create_field_report(body: FieldReportIn):
    rid = uuid.uuid4().hex[:8].upper()
    submitted = body.submitted_at or _now()
    with _lock, _conn() as con:
        con.execute(
            "INSERT INTO field_reports (id, location, type, description, gps, has_photo, submitted_at, created_at) VALUES (?,?,?,?,?,?,?,?)",
            (rid, body.location, body.type, body.description, body.gps, int(body.has_photo), submitted, _now()),
        )
    return FieldReportOut(id=rid, status="Submitted", **{**body.model_dump(), "submitted_at": submitted})


@router.get("/incidents")
def list_incidents() -> List[Dict[str, Any]]:
    with _lock, _conn() as con:
        rows = con.execute("SELECT doc FROM incidents ORDER BY created_at DESC").fetchall()
    return [json.loads(r["doc"]) for r in rows]


@router.post("/incidents", status_code=201)
def upsert_incident(doc: Dict[str, Any]):
    """Create (or replace) an incident document. The client supplies `id`; one is generated if absent."""
    doc = dict(doc)
    doc["id"] = str(doc.get("id") or f"inc-{uuid.uuid4().hex[:8]}")
    with _lock, _conn() as con:
        con.execute(
            "INSERT INTO incidents (id, doc, created_at) VALUES (?,?,?) "
            "ON CONFLICT(id) DO UPDATE SET doc=excluded.doc",
            (doc["id"], json.dumps(doc), _now()),
        )
    return doc


@router.patch("/incidents/{incident_id}")
def patch_incident(incident_id: str, changes: Dict[str, Any]):
    """Merge fields into an existing incident (e.g. acknowledge / resolve)."""
    with _lock, _conn() as con:
        row = con.execute("SELECT doc FROM incidents WHERE id=?", (incident_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Incident not found")
        doc = {**json.loads(row["doc"]), **changes, "id": incident_id}
        con.execute("UPDATE incidents SET doc=? WHERE id=?", (json.dumps(doc), incident_id))
    return doc
