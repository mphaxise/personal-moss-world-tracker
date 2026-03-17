#!/usr/bin/env python3
"""Minimal API + static file server for Personal Moss World Tracker."""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
DB_PATH = DATA_DIR / "moss_tracker.db"
SEED_PATH = DATA_DIR / "seed-entries.json"
UPLOADS_DIR = ROOT_DIR / "uploads"

EMAIL_PATTERN = re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b")
PHONE_PATTERN = re.compile(r"(?:\+?\d[\d\s().-]{6,}\d)")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat().replace("+00:00", "Z")


def sanitize_text(value: object, max_len: int) -> str:
    text = str(value or "")
    text = text.replace("<", "").replace(">", "")
    text = EMAIL_PATTERN.sub("[redacted-email]", text)
    text = PHONE_PATTERN.sub("[redacted-phone]", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_len]


def sanitize_photo_url(value: object) -> str:
    text = str(value or "").strip()
    if not text:
        return ""

    if text.startswith("data:image/"):
        return text

    parsed = urlparse(text)
    if parsed.scheme in {"http", "https"}:
        return text

    return ""


def parse_optional_date(value: object) -> str:
    text = str(value or "").strip()
    if DATE_PATTERN.match(text):
        return text
    return ""


def parse_optional_float(value: object, min_value: float, max_value: float) -> float | None:
    if value is None or value == "":
        return None

    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None

    if numeric < min_value or numeric > max_value:
        return None

    return round(numeric, 4)


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def ensure_upload_dir() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def db_connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    ensure_data_dir()
    ensure_upload_dir()
    with db_connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                photo_url TEXT NOT NULL,
                captured_at TEXT,
                latitude REAL,
                longitude REAL,
                location_label TEXT NOT NULL,
                created_at TEXT NOT NULL,
                contributor_token TEXT NOT NULL,
                inat_observation_id TEXT,
                inat_summary TEXT
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC)")

    seed_if_empty()


def entry_count() -> int:
    with db_connect() as conn:
        row = conn.execute("SELECT COUNT(*) AS count FROM entries").fetchone()
    return int(row["count"])


def seed_if_empty() -> None:
    if entry_count() > 0 or not SEED_PATH.exists():
        return

    with SEED_PATH.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    entries = payload if isinstance(payload, list) else []
    with db_connect() as conn:
        for raw in entries:
            entry = normalize_entry(raw, allow_id=True)
            conn.execute(
                """
                INSERT OR IGNORE INTO entries (
                    id, title, description, photo_url, captured_at,
                    latitude, longitude, location_label, created_at,
                    contributor_token, inat_observation_id, inat_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entry["id"],
                    entry["title"],
                    entry["description"],
                    entry["photo_url"],
                    entry["captured_at"],
                    entry["latitude"],
                    entry["longitude"],
                    entry["location_label"],
                    entry["created_at"],
                    entry["contributor_token"],
                    entry["inat_observation_id"],
                    entry["inat_summary"],
                ),
            )


def normalize_entry(raw: dict, allow_id: bool = False) -> dict:
    entry_id = sanitize_text(raw.get("id", ""), 64) if allow_id else ""
    if not entry_id:
        entry_id = f"entry-{int(datetime.now(tz=timezone.utc).timestamp() * 1000)}-{uuid.uuid4().hex[:6]}"

    title = sanitize_text(raw.get("title", ""), 90)
    if not title:
        title = "Untitled moss world"

    photo_url = sanitize_photo_url(raw.get("photo_url", ""))
    if not photo_url:
        raise ValueError("photo_url is required and must be HTTP(S) or data:image")

    return {
        "id": entry_id,
        "title": title,
        "description": sanitize_text(raw.get("description", ""), 240),
        "photo_url": photo_url,
        "captured_at": parse_optional_date(raw.get("captured_at", "")),
        "latitude": parse_optional_float(raw.get("latitude"), -90.0, 90.0),
        "longitude": parse_optional_float(raw.get("longitude"), -180.0, 180.0),
        "location_label": sanitize_text(raw.get("location_label", ""), 120) or "Location not specified",
        "created_at": sanitize_datetime(raw.get("created_at")) or utc_now_iso(),
        "contributor_token": sanitize_text(raw.get("contributor_token", ""), 64) or f"anon-{uuid.uuid4().hex[:8]}",
        "inat_observation_id": sanitize_text(raw.get("inat_observation_id", ""), 40),
        "inat_summary": sanitize_text(raw.get("inat_summary", ""), 200),
    }


def sanitize_datetime(value: object) -> str:
    text = str(value or "").strip()
    if not text:
        return ""

    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return ""

    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def save_walk_bundle(payload: dict) -> dict:
    items = payload.get("stops")
    item_label = "stops"
    if not isinstance(items, list):
        items = payload.get("cards")
        item_label = "cards"

    if not isinstance(items, list):
        raise ValueError("stops or cards must be an array")

    mode = sanitize_text(payload.get("mode", ""), 40).lower() or "walk-bundle"
    device_label = sanitize_text(payload.get("device_label", ""), 40).lower()
    safe_mode = re.sub(r"[^a-z0-9_-]+", "-", mode).strip("-") or "walk-bundle"
    safe_device = re.sub(r"[^a-z0-9_-]+", "-", device_label).strip("-")
    timestamp = datetime.now(tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    unique_token = uuid.uuid4().hex[:6]
    suffix = f"-{safe_device}" if safe_device else ""
    filename = f"{timestamp}-{safe_mode}{suffix}-{unique_token}.json"
    path = UPLOADS_DIR / filename

    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)

    return {
        "filename": filename,
        "stored_at": utc_now_iso(),
        "path": str(path.relative_to(ROOT_DIR)),
        "item_count": len(items),
        "item_label": item_label,
        "mode": safe_mode,
    }


def fetch_entries() -> list[dict]:
    with db_connect() as conn:
        rows = conn.execute(
            """
            SELECT id, title, description, photo_url, captured_at, latitude,
                   longitude, location_label, created_at, contributor_token,
                   inat_observation_id, inat_summary
            FROM entries
            ORDER BY created_at DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


def insert_entry(raw: dict, allow_id: bool = False) -> dict:
    entry = normalize_entry(raw, allow_id=allow_id)

    with db_connect() as conn:
        conn.execute(
            """
            INSERT INTO entries (
                id, title, description, photo_url, captured_at,
                latitude, longitude, location_label, created_at,
                contributor_token, inat_observation_id, inat_summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                entry["id"],
                entry["title"],
                entry["description"],
                entry["photo_url"],
                entry["captured_at"],
                entry["latitude"],
                entry["longitude"],
                entry["location_label"],
                entry["created_at"],
                entry["contributor_token"],
                entry["inat_observation_id"],
                entry["inat_summary"],
            ),
        )

    return entry


def import_entries(raw_entries: list[dict]) -> dict:
    inserted = 0
    skipped = 0

    with db_connect() as conn:
        for raw in raw_entries:
            try:
                entry = normalize_entry(raw, allow_id=True)
                cursor = conn.execute(
                    """
                    INSERT OR IGNORE INTO entries (
                        id, title, description, photo_url, captured_at,
                        latitude, longitude, location_label, created_at,
                        contributor_token, inat_observation_id, inat_summary
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        entry["id"],
                        entry["title"],
                        entry["description"],
                        entry["photo_url"],
                        entry["captured_at"],
                        entry["latitude"],
                        entry["longitude"],
                        entry["location_label"],
                        entry["created_at"],
                        entry["contributor_token"],
                        entry["inat_observation_id"],
                        entry["inat_summary"],
                    ),
                )
                if cursor.rowcount == 1:
                    inserted += 1
                else:
                    skipped += 1
            except ValueError:
                skipped += 1

    return {"inserted": inserted, "skipped": skipped}


def update_enrichment(entry_id: str, payload: dict) -> bool:
    inat_observation_id = sanitize_text(payload.get("inat_observation_id", ""), 40)
    inat_summary = sanitize_text(payload.get("inat_summary", ""), 200)

    with db_connect() as conn:
        cursor = conn.execute(
            """
            UPDATE entries
            SET inat_observation_id = ?, inat_summary = ?
            WHERE id = ?
            """,
            (inat_observation_id, inat_summary, entry_id),
        )

    return cursor.rowcount > 0


class MossHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        super().log_message(fmt, *args)

    def do_GET(self) -> None:
        if self.path.startswith("/api/"):
            self.handle_api_get()
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path.startswith("/api/"):
            self.handle_api_post()
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_PATCH(self) -> None:
        if self.path.startswith("/api/"):
            self.handle_api_patch()
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def handle_api_get(self) -> None:
        path = urlparse(self.path).path

        if path == "/api/health":
            self.send_json(
                HTTPStatus.OK,
                {"status": "ok", "db": str(DB_PATH), "uploads": str(UPLOADS_DIR)},
            )
            return

        if path == "/api/entries":
            self.send_json(HTTPStatus.OK, {"entries": fetch_entries()})
            return

        if path == "/api/walk-bundles":
            files = sorted(UPLOADS_DIR.glob("*.json"), reverse=True)
            bundles = [
                {
                    "filename": item.name,
                    "path": str(item.relative_to(ROOT_DIR)),
                    "modified_at": datetime.fromtimestamp(item.stat().st_mtime, tz=timezone.utc)
                    .isoformat()
                    .replace("+00:00", "Z"),
                }
                for item in files[:20]
            ]
            self.send_json(HTTPStatus.OK, {"bundles": bundles})
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    def handle_api_post(self) -> None:
        path = urlparse(self.path).path
        payload = self.read_json_body()

        if payload is None:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid JSON payload"})
            return

        if path == "/api/entries":
            try:
                entry = insert_entry(payload)
            except ValueError as exc:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return

            self.send_json(HTTPStatus.CREATED, {"entry": entry})
            return

        if path == "/api/entries/import":
            entries = payload.get("entries")
            if not isinstance(entries, list):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "entries must be an array"})
                return

            summary = import_entries(entries)
            self.send_json(HTTPStatus.OK, summary)
            return

        if path == "/api/walk-bundles":
            try:
                summary = save_walk_bundle(payload)
            except ValueError as exc:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return

            self.send_json(HTTPStatus.CREATED, summary)
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    def handle_api_patch(self) -> None:
        path = urlparse(self.path).path
        match = re.match(r"^/api/entries/([^/]+)/enrichment$", path)
        if not match:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return

        payload = self.read_json_body()
        if payload is None:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid JSON payload"})
            return

        updated = update_enrichment(match.group(1), payload)
        if not updated:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Entry not found"})
            return

        self.send_json(HTTPStatus.OK, {"updated": True})

    def read_json_body(self) -> dict | None:
        content_length = self.headers.get("Content-Length")
        if not content_length:
            return {}

        try:
            raw_length = int(content_length)
        except ValueError:
            return None

        raw_body = self.rfile.read(raw_length)
        try:
            parsed = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None

        return parsed if isinstance(parsed, dict) else None

    def send_json(self, status: HTTPStatus, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the moss tracker API + static server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    init_db()

    server = ThreadingHTTPServer((args.host, args.port), MossHandler)
    print(f"Serving moss tracker on http://{args.host}:{args.port}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
