"""Disk persistence for query history and generated reports.

Simple JSON-file storage under backend/data/ — adequate for a demo and survives
restarts. Queries and report metadata live in JSON; report markdown and PDFs are
written as individual files.
"""
from __future__ import annotations

import datetime as dt
import json
import threading
import uuid
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
REPORTS_DIR = DATA_DIR / "reports"
QUERIES_FILE = DATA_DIR / "queries.json"
REPORTS_FILE = DATA_DIR / "reports.json"

_lock = threading.Lock()


def _ensure() -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def _load(path: Path) -> list:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def _save(path: Path, data: list) -> None:
    _ensure()
    path.write_text(json.dumps(data, indent=2))


def now_iso() -> str:
    return dt.datetime.now().isoformat(timespec="seconds")


def new_id() -> str:
    return uuid.uuid4().hex[:12]


# ---- queries ----

def save_query(record: dict) -> dict:
    """Persist a completed query. Returns the stored record."""
    with _lock:
        queries = _load(QUERIES_FILE)
        queries = [q for q in queries if q["id"] != record["id"]]  # upsert
        queries.insert(0, record)  # newest first
        queries = queries[:200]  # cap history size
        _save(QUERIES_FILE, queries)
    return record


def list_queries() -> list[dict]:
    """Lightweight history list (no heavy event payloads)."""
    out = []
    for q in _load(QUERIES_FILE):
        out.append(
            {
                "id": q["id"],
                "question": q["question"],
                "created_at": q["created_at"],
                "answer": q.get("answer", ""),
                "report_ids": q.get("report_ids", []),
            }
        )
    return out


def get_query(query_id: str) -> dict | None:
    for q in _load(QUERIES_FILE):
        if q["id"] == query_id:
            return q
    return None


def delete_query(query_id: str) -> None:
    with _lock:
        queries = [q for q in _load(QUERIES_FILE) if q["id"] != query_id]
        _save(QUERIES_FILE, queries)


def _attach_report(query_id: str, report_id: str) -> None:
    with _lock:
        queries = _load(QUERIES_FILE)
        for q in queries:
            if q["id"] == query_id:
                q.setdefault("report_ids", [])
                if report_id not in q["report_ids"]:
                    q["report_ids"].append(report_id)
                break
        _save(QUERIES_FILE, queries)


# ---- reports ----

def save_report(
    *, query_id: str | None, question: str, title: str, markdown: str, pdf_bytes: bytes
) -> dict:
    """Write report markdown + PDF to disk and record metadata."""
    _ensure()
    report_id = new_id()
    md_path = REPORTS_DIR / f"{report_id}.md"
    pdf_path = REPORTS_DIR / f"{report_id}.pdf"
    md_path.write_text(markdown)
    pdf_path.write_bytes(pdf_bytes)

    meta = {
        "id": report_id,
        "query_id": query_id,
        "question": question,
        "title": title,
        "created_at": now_iso(),
        "md_file": str(md_path),
        "pdf_file": str(pdf_path),
    }
    with _lock:
        reports = _load(REPORTS_FILE)
        reports.insert(0, meta)
        _save(REPORTS_FILE, reports)
    if query_id:
        _attach_report(query_id, report_id)
    return meta


def list_reports() -> list[dict]:
    return [
        {k: r[k] for k in ("id", "query_id", "question", "title", "created_at")}
        for r in _load(REPORTS_FILE)
    ]


def get_report(report_id: str) -> dict | None:
    for r in _load(REPORTS_FILE):
        if r["id"] == report_id:
            md = Path(r["md_file"])
            return {**r, "markdown": md.read_text() if md.exists() else ""}
    return None


def get_report_pdf_path(report_id: str) -> Path | None:
    for r in _load(REPORTS_FILE):
        if r["id"] == report_id:
            p = Path(r["pdf_file"])
            return p if p.exists() else None
    return None


def delete_report(report_id: str) -> None:
    with _lock:
        reports = _load(REPORTS_FILE)
        keep = []
        for r in reports:
            if r["id"] == report_id:
                for key in ("md_file", "pdf_file"):
                    try:
                        Path(r[key]).unlink(missing_ok=True)
                    except OSError:
                        pass
            else:
                keep.append(r)
        _save(REPORTS_FILE, keep)
