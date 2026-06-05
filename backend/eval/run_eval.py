"""Run the Parallax benchmark: prompts x models -> graded results.json.

Usage (from backend/):
    .venv/bin/python eval/run_eval.py                 # both models, all cases
    .venv/bin/python eval/run_eval.py --models sonnet  # one model
    .venv/bin/python eval/run_eval.py --limit 3        # quick subset

Each run executes the full agent (real satellite tool calls), captures the tools
used + final answer + latency, then grades with the LLM judge.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from dotenv import load_dotenv

load_dotenv(BACKEND / ".env")

from app.agent import run_agent  # noqa: E402
from judge import DIMENSIONS, JUDGE_MODEL, judge_response  # noqa: E402

EVAL_DIR = Path(__file__).resolve().parent
BENCHMARK = json.loads((EVAL_DIR / "benchmark.json").read_text())
RESULTS_FILE = EVAL_DIR / "results.json"

MODEL_IDS = {"opus": "claude-opus-4-8", "sonnet": "claude-sonnet-4-6"}

_sem = asyncio.Semaphore(3)  # limit concurrent agent runs


async def run_case(case: dict, model_key: str) -> dict:
    model_id = MODEL_IDS[model_key]
    tools: list[str] = []
    answer = ""
    error = None
    async with _sem:
        # Start timing only once a concurrency slot is acquired, so latency
        # reflects actual execution time, not time spent queued behind other runs.
        t0 = time.perf_counter()
        try:
            async for ev in run_agent(case["prompt"], [], model=model_id):
                if ev["type"] == "tool_call":
                    tools.append(ev["name"])
                elif ev["type"] == "answer":
                    answer = ev["text"]
                elif ev["type"] == "error":
                    error = ev["message"]
        except Exception as exc:  # keep the suite running on a single failure
            error = str(exc)
        latency = round(time.perf_counter() - t0, 1)

    scores = await judge_response(case, tools, answer or (error or ""))
    print(f"  [{model_key:6}] {case['id']:26} overall={scores['overall']}  ({latency}s, tools={len(tools)})")
    return {
        "id": case["id"],
        "domain": case["domain"],
        "prompt": case["prompt"],
        "model": model_key,
        "model_id": model_id,
        "tools_used": tools,
        "answer": answer,
        "error": error,
        "latency_s": latency,
        "scores": scores,
    }


def summarize(runs: list[dict], models: list[str]) -> dict:
    by_model = {}
    for m in models:
        rs = [r for r in runs if r["model"] == m]
        if not rs:
            continue
        dims = {d: round(sum(r["scores"][d] for r in rs) / len(rs), 2) for d in DIMENSIONS}
        by_model[m] = {
            **dims,
            "overall": round(sum(r["scores"]["overall"] for r in rs) / len(rs), 2),
            "avg_latency_s": round(sum(r["latency_s"] for r in rs) / len(rs), 1),
            "n": len(rs),
        }

    by_model_domain = defaultdict(dict)
    domains = sorted({r["domain"] for r in runs})
    for m in models:
        for dom in domains:
            rs = [r for r in runs if r["model"] == m and r["domain"] == dom]
            if rs:
                by_model_domain[m][dom] = round(sum(r["scores"]["overall"] for r in rs) / len(rs), 2)

    return {"by_model": by_model, "by_model_domain": dict(by_model_domain), "domains": domains}


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="+", default=["opus", "sonnet"], choices=list(MODEL_IDS))
    ap.add_argument("--limit", type=int, default=0, help="cap number of cases (0 = all)")
    args = ap.parse_args()

    cases = BENCHMARK["cases"][: args.limit] if args.limit else BENCHMARK["cases"]
    print(f"Running {len(cases)} cases x {len(args.models)} models = "
          f"{len(cases) * len(args.models)} runs · judge={JUDGE_MODEL}")

    tasks = [run_case(c, m) for m in args.models for c in cases]
    runs = await asyncio.gather(*tasks)

    results = {
        "benchmark": BENCHMARK["name"],
        "version": BENCHMARK["version"],
        "judge_model": JUDGE_MODEL,
        "model_ids": {m: MODEL_IDS[m] for m in args.models},
        "dimensions": BENCHMARK["dimensions"],
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "n_cases": len(cases),
        "runs": sorted(runs, key=lambda r: (r["domain"], r["id"], r["model"])),
        "summary": summarize(runs, args.models),
    }
    RESULTS_FILE.write_text(json.dumps(results, indent=2))
    print(f"\nWrote {RESULTS_FILE}")
    for m, s in results["summary"]["by_model"].items():
        print(f"  {m:6} overall={s['overall']}  latency={s['avg_latency_s']}s")


if __name__ == "__main__":
    asyncio.run(main())
