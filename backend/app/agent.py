"""The Parallax agent loop.

Drives Claude through a tool-use conversation: geocode -> fetch imagery / fires /
NDVI / change-detection -> analyse with vision -> answer. Implemented as an async
generator that yields structured events the API layer forwards over SSE.

Conversation memory: the caller passes a per-session `messages` list. The loop
appends each turn to it so follow-up questions retain context. `compact_history`
strips heavy base64 imagery from completed turns to keep token cost bounded.
"""
from __future__ import annotations

import copy
import os

from anthropic import AsyncAnthropic

from .tools import TOOLS, run_tool

MODEL = os.getenv("PARALLAX_MODEL", "claude-opus-4-8")
MAX_TURNS = 8

SYSTEM_PROMPT = """You are Parallax, an agentic geospatial intelligence engine. \
Users ask questions about anywhere on Earth and you answer using live satellite data.

Your workflow for every question:
1. Call geocode_location to pin down the area (skip if the area is already known \
from earlier in the conversation and unchanged).
2. Choose the RIGHT tool(s):
   - get_active_fires (NASA FIRMS) — the PRIMARY tool for any wildfire / active-fire \
question. Real thermal hotspots with exact counts and locations.
   - get_realtime_imagery (NASA GIBS, daily, coarse) — smoke, floods, dust storms, \
hurricanes, snow, volcanic activity, blooms; large-scale and time-sensitive. Also \
serves the HISTORICAL archive: pass `date` for any past day.
   - get_highres_imagery (Sentinel-2, ~10m, a few days old) — detailed true-color \
analysis: urban areas, water bodies, coastlines, infrastructure. Pass `datetime_range` \
for a specific past period.
   - get_basemap_imagery (Esri, sub-meter, undated mosaic) — finest spatial detail \
(buildings, runways, ships) when current freshness does NOT matter.
   - get_vegetation_index (NDVI) — crop health, drought stress, vegetation vigor. \
Quantitative (returns real mean/min/max NDVI and % healthy).
   - compare_over_time — change questions (shrinking lakes, deforestation, glacier \
retreat, urban growth, post-disaster). Returns two dated scenes to compare.
   You may call several tools; combine their evidence.
   HISTORICAL questions ("was it snowing on Mt Fuji in March 2022?"): extract the date \
from the question and pass it through (GIBS `date` for a specific day; Sentinel-2 / NDVI \
`datetime_range` for a month window). Do not answer historical questions from memory — \
fetch the imagery for that date.
3. Actually LOOK at returned imagery and cite concrete observations (colours, plumes, \
water extent, burn scars, NDVI values, fire counts). For change detection, state what \
differs between the two dates.
4. Give a clear, specific answer grounded in the data.

Be honest about limitations: imagery date/latency, cloud cover, resolution too coarse \
to resolve something, or "no detections" results. Never invent detail the data doesn't \
support. Keep the final answer concise and concrete — a couple of short paragraphs at most."""


def compact_history(messages: list[dict]) -> list[dict]:
    """Return a copy of the transcript with base64 image blocks replaced by a
    short text placeholder, so stored session history stays small."""
    out = copy.deepcopy(messages)
    for msg in out:
        content = msg.get("content")
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict):
                continue
            # tool_result blocks carry a nested content list that may hold images.
            inner = block.get("content") if block.get("type") == "tool_result" else None
            if isinstance(inner, list):
                block["content"] = [
                    {"type": "text", "text": "[imagery omitted from history]"}
                    if isinstance(b, dict) and b.get("type") == "image"
                    else b
                    for b in inner
                ]
    return out


def trim_history(messages: list[dict], max_messages: int) -> list[dict]:
    """Trim to at most ~max_messages, snapping the start to a user-question
    boundary so we never orphan a tool_result from its tool_use (which the API
    rejects). A single very long turn is kept whole rather than broken."""
    if len(messages) <= max_messages:
        return messages
    # Boundaries are plain-text user turns (the start of each question).
    boundaries = [
        i for i, m in enumerate(messages)
        if m.get("role") == "user" and isinstance(m.get("content"), str)
    ]
    if not boundaries:
        return messages
    for b in boundaries:  # earliest boundary whose tail still fits = most context
        if len(messages) - b <= max_messages:
            return messages[b:]
    return messages[boundaries[-1]:]  # last turn alone exceeds the cap; keep it whole


async def run_agent(
    question: str,
    messages: list[dict],
    *,
    system: str = SYSTEM_PROMPT,
    max_tokens: int = 2000,
    max_turns: int = MAX_TURNS,
    model: str = MODEL,
):
    """Run one user turn. `messages` is the mutable session transcript; the new
    question is appended here. Yields UI events. `system`/`max_tokens`/`max_turns`
    can be overridden (e.g. for deep-research report generation)."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        yield {"type": "error", "message": "ANTHROPIC_API_KEY is not set. Add it to backend/.env."}
        yield {"type": "done"}
        return

    client = AsyncAnthropic(api_key=api_key)
    messages.append({"role": "user", "content": question})

    try:
        for _turn in range(max_turns):
            assistant_blocks: list[dict] = []
            tool_uses: list = []

            async with client.messages.stream(
                model=model,
                max_tokens=max_tokens,
                system=system,
                tools=TOOLS,
                messages=messages,
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_start" and event.content_block.type == "tool_use":
                        yield {"type": "status", "message": f"Calling {event.content_block.name}…"}
                    elif event.type == "text" and event.text:
                        yield {"type": "token", "text": event.text}
                final = await stream.get_final_message()

            for block in final.content:
                if block.type == "text":
                    assistant_blocks.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    assistant_blocks.append(
                        {"type": "tool_use", "id": block.id, "name": block.name, "input": block.input}
                    )
                    tool_uses.append(block)
            messages.append({"role": "assistant", "content": assistant_blocks})

            if final.stop_reason != "tool_use":
                answer_text = "".join(b["text"] for b in assistant_blocks if b["type"] == "text")
                yield {"type": "answer", "text": answer_text}
                yield {"type": "done"}
                return

            # Interim text the model wrote before deciding to call tools = its
            # reasoning for this step. Surface it for the agent-trace view.
            interim = "".join(b["text"] for b in assistant_blocks if b["type"] == "text").strip()
            if interim:
                yield {"type": "reasoning", "text": interim}

            tool_results: list[dict] = []
            for tu in tool_uses:
                yield {"type": "tool_call", "name": tu.name, "input": tu.input}
                try:
                    summary, payload = await run_tool(tu.name, tu.input)
                except Exception as exc:
                    summary, payload = f"Tool error: {exc}", None
                    yield {"type": "status", "message": f"{tu.name} failed: {exc}"}

                content = await _emit_and_build_content(summary, payload, _sink := [])
                for ev in _sink:
                    yield ev
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": tu.id, "content": content}
                )

            messages.append({"role": "user", "content": tool_results})

        yield {"type": "error", "message": "Reached maximum reasoning turns without a final answer."}
        yield {"type": "done"}
    except Exception as exc:
        yield {"type": "error", "message": f"Agent error: {exc}"}
        yield {"type": "done"}


async def _emit_and_build_content(summary: str, payload, sink: list) -> list[dict]:
    """Append UI events to `sink` and return the tool_result content for Claude."""
    kind = payload.get("kind") if payload else None

    if kind == "location":
        sink.append({"type": "location", **{k: v for k, v in payload.items() if k != "kind"}})
        return [{"type": "text", "text": summary}]

    if kind == "fires":
        sink.append({"type": "fires", **{k: v for k, v in payload.items() if k != "kind"}})
        return [{"type": "text", "text": summary}]

    if kind == "imagery":
        sink.append(
            {"type": "imagery", **{k: v for k, v in payload.items() if k not in ("kind", "b64")}}
        )
        return [
            {"type": "text", "text": summary},
            {"type": "image", "source": {"type": "base64", "media_type": payload["media_type"], "data": payload["b64"]}},
        ]

    if kind == "comparison":
        sink.append(
            {"type": "comparison", **{k: v for k, v in payload.items() if k != "image_blocks"}}
        )
        return [{"type": "text", "text": summary}, *payload["image_blocks"]]

    return [{"type": "text", "text": summary}]
