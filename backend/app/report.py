"""Deep-research report generation.

Runs the agent in a long-form "report mode": it researches a question thoroughly
(multiple sources, historical/temporal context) and produces a structured markdown
report with embedded satellite imagery. The markdown is saved, converted to PDF
(with images inlined), and both are persisted via storage.
"""
from __future__ import annotations

import asyncio
import base64
import io
import re

import httpx
import markdown as md_lib
from xhtml2pdf import pisa

from .agent import run_agent
from . import storage

REPORT_SYSTEM = """You are Parallax, an agentic geospatial intelligence engine, writing a \
DEEP-RESEARCH REPORT. Investigate the user's question thoroughly using your satellite tools, \
then write a comprehensive, well-structured markdown report.

Gather strong evidence before writing: locate the area, and pull MULTIPLE relevant data \
sources (e.g. real-time imagery, high-res Sentinel-2 or Esri detail, active fires, NDVI \
vegetation, and change-over-time when relevant). For anything time-related, include \
historical/temporal context by fetching imagery from earlier dates. Actually analyse every \
image you fetch.

Then output ONLY the report as markdown (no preamble), using this structure:
# <concise report title>
**Location:** … | **Date of analysis:** … | **Data sources:** …
## Executive Summary
(3-5 sentences answering the question directly with the key finding.)
## Area of Interest
(What/where, why it matters.)
## Findings
(Detailed, with a subsection per data source / analysis. Cite concrete observations: \
colours, extents, NDVI values, fire counts, what changed between dates. EMBED the imagery \
you fetched using markdown image syntax with the exact "Embeddable image URL" given to you, \
each with a caption noting source and date.)
## Temporal / Historical Context
(How things have changed over time, if relevant.)
## Limitations & Confidence
(Imagery dates/latency, cloud cover, resolution limits, what you could NOT determine.)
## Conclusion
(Direct, specific answer with a confidence statement.)

Be rigorous and concrete — never invent detail the imagery doesn't support. Embed at least \
the most important images so the report is visual."""


async def generate_report(question: str, query_id: str | None):
    """Async generator: yields progress events, then a final 'report_done' event.

    Mirrors the query SSE protocol so the frontend can reuse its stream parser.
    """
    yield {"type": "status", "message": "Starting deep-research report…"}

    answer_parts: list[str] = []
    imagery_used: list[dict] = []  # everything the agent actually fetched
    messages: list[dict] = []
    async for ev in run_agent(
        question, messages, system=REPORT_SYSTEM, max_tokens=4000, max_turns=12
    ):
        t = ev["type"]
        if t in ("tool_call", "status", "location", "imagery", "fires", "comparison"):
            yield ev  # let the UI show the research happening
        if t == "imagery":
            imagery_used.append({"source": ev["source"], "date": ev.get("date"), "url": ev["url"]})
        elif t == "comparison":
            for f in ev.get("frames", []):
                imagery_used.append({"source": ev["source"], "date": f.get("date"), "url": f["url"]})
        elif t == "token":
            answer_parts.append(ev["text"])
        elif t == "answer":
            answer_parts = [ev["text"]]
        elif t == "error":
            yield ev
            yield {"type": "done"}
            return

    markdown = _clean_markdown("".join(answer_parts))
    if not markdown:
        yield {"type": "error", "message": "Report generation produced no content."}
        yield {"type": "done"}
        return

    markdown = _append_imagery_appendix(markdown, imagery_used)

    title = _extract_title(markdown, question)
    yield {"type": "status", "message": "Rendering PDF…"}
    pdf_bytes = await _markdown_to_pdf(markdown, title)

    meta = storage.save_report(
        query_id=query_id,
        question=question,
        title=title,
        markdown=markdown,
        pdf_bytes=pdf_bytes,
    )
    yield {
        "type": "report_done",
        "report_id": meta["id"],
        "title": title,
        "markdown": markdown,
        "created_at": meta["created_at"],
    }
    yield {"type": "done"}


def _clean_markdown(text: str) -> str:
    """Drop any chatty preamble before the first top-level '# ' heading."""
    text = text.strip()
    m = re.search(r"^#\s+.+$", text, re.MULTILINE)
    return text[m.start():].strip() if m else text


def _extract_title(markdown: str, fallback: str) -> str:
    m = re.search(r"^#\s+(.+)$", markdown, re.MULTILINE)
    return m.group(1).strip() if m else fallback[:80]


def _append_imagery_appendix(markdown: str, imagery: list[dict]) -> str:
    """Guarantee the imagery the agent fetched appears, via an appendix gallery
    of anything not already embedded inline."""
    if not imagery:
        return markdown
    embedded = set(re.findall(r"!\[[^\]]*\]\(([^)]+)\)", markdown))
    seen, extra = set(), []
    for im in imagery:
        if im["url"] in embedded or im["url"] in seen:
            continue
        seen.add(im["url"])
        extra.append(im)
    if not extra:
        return markdown
    lines = ["\n\n## Imagery Used\n", "*All satellite imagery the agent fetched for this report:*\n"]
    for im in extra:
        cap = f"{im['source']}" + (f" — {im['date']}" if im.get("date") else "")
        lines.append(f"![{cap}]({im['url']})")
        lines.append(f"*{cap}*\n")
    return markdown + "\n".join(lines)


async def _fetch_data_uri(client: httpx.AsyncClient, url: str) -> str | None:
    try:
        r = await client.get(url, timeout=20)
        r.raise_for_status()
        ctype = r.headers.get("content-type", "image/png").split(";")[0]
        b64 = base64.b64encode(r.content).decode("ascii")
        return f"data:{ctype};base64,{b64}"
    except Exception:
        return None


async def _markdown_to_pdf(markdown: str, title: str) -> bytes:
    """Render markdown to PDF, inlining remote images as base64 (best effort)."""
    html_body = md_lib.markdown(markdown, extensions=["extra", "sane_lists", "nl2br"])

    # Inline <img src="http…"> as data URIs so xhtml2pdf needs no network at render time.
    # NB: markdown HTML-escapes '&' to '&amp;' in the src, so unescape before fetching.
    uniq = list(dict.fromkeys(re.findall(r'<img[^>]+src="(https?://[^"]+)"', html_body)))
    if uniq:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            data_uris = await asyncio.gather(
                *[_fetch_data_uri(client, u.replace("&amp;", "&")) for u in uniq]
            )
        for u, d in zip(uniq, data_uris):
            if d:
                html_body = html_body.replace(f'src="{u}"', f'src="{d}"')
            else:
                # Drop unfetchable images so the PDF still renders cleanly.
                html_body = re.sub(rf'<img[^>]+src="{re.escape(u)}"[^>]*>', "", html_body)

    # Strip the leading H1 from the body; we render it in a styled cover band.
    body_no_h1 = re.sub(r"<h1>.*?</h1>", "", html_body, count=1, flags=re.DOTALL)

    html = f"""<html><head><meta charset="utf-8"><style>
      @page {{
        size: A4; margin: 2.4cm 2cm 2cm 2cm;
        @frame footer {{ -pdf-frame-content: footerContent; bottom: 1.1cm; left: 2cm; right: 2cm; height: 1cm; }}
      }}
      body {{ font-family: Helvetica, Arial, sans-serif; font-size: 10.5px; color: #1b2330; line-height: 1.55; }}
      .eyebrow {{ font-size: 8px; letter-spacing: 3px; color: #2a7fb8; text-transform: uppercase; }}
      .cover-title {{ font-size: 23px; font-weight: bold; color: #0b3d66; margin: 4px 0 6px 0; }}
      .cover-rule {{ border-bottom: 3px solid #4cc9f0; margin-bottom: 4px; }}
      .cover-meta {{ font-size: 8.5px; color: #6b7686; margin-bottom: 16px; }}
      h2 {{ font-size: 14px; color: #0b3d66; margin-top: 20px; margin-bottom: 4px;
            border-bottom: 1px solid #d8e4ee; padding-bottom: 3px; }}
      h3 {{ font-size: 11.5px; color: #2a3a4d; margin-top: 12px; margin-bottom: 2px; }}
      p {{ margin: 5px 0; }}
      ul, ol {{ margin: 5px 0; }}
      li {{ margin: 2px 0; }}
      strong {{ color: #11202e; }}
      em {{ color: #5a6675; }}
      img {{ max-width: 420px; margin: 8px 0 2px 0; border: 1px solid #c7d2dd; }}
      code {{ background: #eef2f6; padding: 1px 4px; font-size: 9.5px; }}
      blockquote {{ border-left: 3px solid #f0a500; background: #fff8e8; margin: 8px 0;
                    padding: 4px 10px; color: #5a4a1a; }}
      table {{ border-collapse: collapse; width: 100%; margin: 8px 0; }}
      th, td {{ border: 1px solid #d8e4ee; padding: 4px 7px; font-size: 9.5px; text-align: left; }}
      th {{ background: #eef4f9; color: #0b3d66; }}
      #footerContent {{ font-size: 8px; color: #9aa4b2; }}
    </style></head><body>
    <div class="eyebrow">Parallax · Deep Research Report</div>
    <div class="cover-title">{_escape(title)}</div>
    <div class="cover-rule"></div>
    <div class="cover-meta">Generated by the Parallax Agentic Satellite Query Engine · grounded in live satellite imagery</div>
    {body_no_h1}
    <div id="footerContent">Parallax · Agentic Satellite Query Engine&nbsp;&nbsp;|&nbsp;&nbsp;page <pdf:pagenumber> of <pdf:pagecount></div>
    </body></html>"""

    buf = io.BytesIO()
    pisa.CreatePDF(src=html, dest=buf, encoding="utf-8")
    return buf.getvalue()


def _escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
