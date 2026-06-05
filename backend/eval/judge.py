"""LLM-as-judge grading for the Parallax benchmark.

Given a benchmark case (prompt + rubric), the tools the agent invoked, and its
final answer, a fixed judge model scores four dimensions 1-5 and returns a short
rationale. The judge evaluates the *response* — its tool selection, groundedness
in the data it cites, plausibility, and clarity — it does not independently
re-verify the satellite pixels.
"""
from __future__ import annotations

import json
import os
import re

from anthropic import AsyncAnthropic

# A fixed, capable judge keeps scoring consistent across the models under test.
JUDGE_MODEL = os.getenv("PARALLAX_JUDGE_MODEL", "claude-sonnet-4-6")

DIMENSIONS = ["tool_use", "groundedness", "correctness", "clarity"]

JUDGE_SYSTEM = """You are a rigorous evaluator of a geospatial AI agent that answers \
questions using live satellite data. You grade ONE response. Be calibrated and critical: \
reserve 5 for excellent, use 3 for adequate-but-flawed, and 1-2 for poor. Reward concrete, \
data-grounded answers and honest limitation statements; penalise vague or hallucinated detail.

Score these four dimensions from 1 to 5 (integers):
- tool_use: appropriateness of the satellite tools the agent chose for THIS question.
- groundedness: extent the answer cites concrete observations from the fetched imagery/data.
- correctness: plausibility and internal consistency with the data and real-world facts.
- clarity: directness, specificity, and honesty about limitations.

Return ONLY a JSON object: {"tool_use":N,"groundedness":N,"correctness":N,"clarity":N,"rationale":"one or two sentences"}."""


async def judge_response(case: dict, tools_used: list[str], answer: str) -> dict:
    client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    user = (
        f"QUESTION: {case['prompt']}\n"
        f"DOMAIN: {case['domain']}\n"
        f"RUBRIC (what a strong answer needs): {case['rubric']}\n"
        f"TOOLS THE AGENT INVOKED: {', '.join(tools_used) or '(none)'}\n\n"
        f"AGENT ANSWER:\n{answer or '(empty)'}\n\n"
        "Grade it now as JSON."
    )
    resp = await client.messages.create(
        model=JUDGE_MODEL,
        max_tokens=400,
        system=JUDGE_SYSTEM,
        messages=[{"role": "user", "content": user}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text")
    scores = _parse(text)
    scores["overall"] = round(sum(scores[d] for d in DIMENSIONS) / len(DIMENSIONS), 2)
    return scores


def _parse(text: str) -> dict:
    m = re.search(r"\{.*\}", text, re.DOTALL)
    try:
        data = json.loads(m.group(0)) if m else {}
    except json.JSONDecodeError:
        data = {}
    out = {}
    for d in DIMENSIONS:
        try:
            out[d] = max(1, min(5, int(round(float(data.get(d, 3))))))
        except (TypeError, ValueError):
            out[d] = 3
    out["rationale"] = str(data.get("rationale", ""))[:300]
    return out
