"""Parallax FastAPI backend.

Streams the agent's reasoning, imagery/fires, and answer to the browser over SSE;
persists query history and deep-research reports to disk; serves both back to the UI.
"""
from __future__ import annotations

import json
import os
from collections import OrderedDict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

load_dotenv()  # read backend/.env

from .agent import compact_history, run_agent, trim_history  # noqa: E402
from .report import generate_report  # noqa: E402
from . import storage  # noqa: E402

app = FastAPI(title="Parallax", description="Agentic Satellite Query Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_SESSIONS: "OrderedDict[str, list]" = OrderedDict()
_MAX_SESSIONS = 50
_MAX_HISTORY_MESSAGES = 20

# Events worth persisting so a saved query can be re-rendered in history.
_PERSIST_EVENTS = {"reasoning", "tool_call", "location", "imagery", "fires", "comparison", "answer"}

_SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


class Query(BaseModel):
    question: str
    session_id: str = "default"


class ReportRequest(BaseModel):
    query_id: str | None = None
    question: str | None = None


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@app.get("/api/eval")
async def eval_results():
    """Serve the benchmark results produced by eval/run_eval.py (if present)."""
    import json as _json
    from pathlib import Path

    path = Path(__file__).resolve().parent.parent / "eval" / "results.json"
    if not path.exists():
        return {"available": False}
    return {"available": True, **_json.loads(path.read_text())}


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "has_key": bool(os.getenv("ANTHROPIC_API_KEY")),
        "firms_enabled": bool(os.getenv("FIRMS_MAP_KEY")),
        "model": os.getenv("PARALLAX_MODEL", "claude-opus-4-8"),
    }


@app.post("/api/reset")
async def reset(q: Query):
    _SESSIONS.pop(q.session_id, None)
    return {"ok": True}


async def _event_stream(question: str, session_id: str):
    query_id = storage.new_id()
    yield _sse({"type": "meta", "query_id": query_id})

    messages = _SESSIONS.get(session_id, [])
    persisted: list[dict] = []
    answer_text = ""

    async for event in run_agent(question, messages):
        if event["type"] in _PERSIST_EVENTS:
            persisted.append(event)
        if event["type"] == "answer":
            answer_text = event["text"]
        yield _sse(event)

    # Persist session memory for follow-ups…
    history = trim_history(compact_history(messages), _MAX_HISTORY_MESSAGES)
    _SESSIONS[session_id] = history
    _SESSIONS.move_to_end(session_id)
    while len(_SESSIONS) > _MAX_SESSIONS:
        _SESSIONS.popitem(last=False)

    # …and the query itself to history.
    storage.save_query(
        {
            "id": query_id,
            "question": question,
            "answer": answer_text,
            "events": persisted,
            "created_at": storage.now_iso(),
            "session_id": session_id,
            "report_ids": [],
        }
    )


@app.post("/api/query")
async def query(q: Query):
    return StreamingResponse(
        _event_stream(q.question, q.session_id), media_type="text/event-stream", headers=_SSE_HEADERS
    )


# ---- history ----

@app.get("/api/history")
async def history():
    return storage.list_queries()


@app.get("/api/history/{query_id}")
async def history_item(query_id: str):
    q = storage.get_query(query_id)
    if not q:
        raise HTTPException(404, "Query not found")
    return q


@app.delete("/api/history/{query_id}")
async def history_delete(query_id: str):
    storage.delete_query(query_id)
    return {"ok": True}


# ---- reports ----

async def _report_stream(question: str, query_id: str | None):
    async for event in generate_report(question, query_id):
        yield _sse(event)


@app.post("/api/report")
async def report(req: ReportRequest):
    question = req.question
    if req.query_id and not question:
        q = storage.get_query(req.query_id)
        if not q:
            raise HTTPException(404, "Query not found")
        question = q["question"]
    if not question:
        raise HTTPException(400, "Provide a query_id or a question")
    return StreamingResponse(
        _report_stream(question, req.query_id), media_type="text/event-stream", headers=_SSE_HEADERS
    )


@app.get("/api/reports")
async def reports():
    return storage.list_reports()


@app.get("/api/reports/{report_id}")
async def report_item(report_id: str):
    r = storage.get_report(report_id)
    if not r:
        raise HTTPException(404, "Report not found")
    return r


@app.get("/api/reports/{report_id}/pdf")
async def report_pdf(report_id: str):
    path = storage.get_report_pdf_path(report_id)
    if not path:
        raise HTTPException(404, "Report PDF not found")
    return FileResponse(path, media_type="application/pdf", filename=f"parallax-report-{report_id}.pdf")


@app.delete("/api/reports/{report_id}")
async def report_delete(report_id: str):
    storage.delete_report(report_id)
    return {"ok": True}
