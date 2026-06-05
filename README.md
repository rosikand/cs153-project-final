<img width="2048" height="1143" alt="image" src="https://github.com/user-attachments/assets/c4a49dbb-ccc7-4e11-8c06-5003a7067a88" />


# Parallax — Agentic Satellite Query Engine

**Ask a question about anywhere on Earth and get a real answer from live satellite imagery.**

> **CS 153 — The One-Person Frontier Lab · Final Project**
> **Project track:** Automation / Agent Systems (Domain-Specific: geospatial intelligence)

Parallax is an *agentic* satellite query engine. You ask a natural-language question — *"Are there wildfires near Athens right now?"*, *"How has Lake Mead changed since 2016?"*, *"Was it snowing on Mount Fuji in March 2022?"* — and an LLM agent locates the place, decides which satellite source can actually answer it, pulls the imagery live, **looks at the pixels with vision**, and reasons out an answer. The map shows you exactly what it saw, and any query can be turned into a cited deep-research report.

---

## Why we built it

Every day, satellites image the entire surface of the Earth — petabytes of open, free data from NASA, ESA, and others. Almost nobody can use it: pulling the right scene, for the right place, on the right date, and *interpreting* the pixels takes a GIS specialist and hours of work. Parallax collapses that to a sentence, for three very different audiences — environmental responders, everyday consumers, and financial/alt-data analysts. See the presentation video for more details and motivations. 

## What it does

- **Natural-language geospatial Q&A**, grounded in live satellite pixels (Claude vision), not model memory.
- **Seven agent tools** the model chooses among per question (see table below).
- **Historical queries** — fetches imagery for a specific past date.
- **Conversation memory** — ask follow-ups without restating the place.
- **Deep-research reports** — one click turns a query into a multi-section, cited report with embedded imagery, saved as **rendered markdown + downloadable PDF**.
- **Query history** and a **Reports** library.
- **Agent trace** — every answer shows *how the agent reached it*: reasoning path, tools & sequence, and sources & limitations.
- **A reproducible evaluation benchmark** with an Opus-vs-Sonnet comparison.

### The agent's tools

| Tool | Source | What it does |
|------|--------|--------------|
| `geocode_location` | OpenStreetMap Nominatim | Find the area (always first) |
| `get_active_fires` | **NASA FIRMS** | Real active-fire detection points (VIIRS) — exact counts & locations |
| `get_realtime_imagery` | **NASA GIBS** (~1 day, ~250 m–1 km) | Smoke, floods, storms, snow, blooms — **plus the full historical archive** |
| `get_highres_imagery` | **Sentinel-2** via Planetary Computer (~10 m) | Detailed true-color: cities, water bodies, coastlines |
| `get_basemap_imagery` | **Esri World Imagery** (sub-meter mosaic) | Finest spatial detail — buildings, runways, ships |
| `get_vegetation_index` | **Sentinel-2 NDVI** | Crop health / drought — real mean/min/max NDVI + % healthy |
| `compare_over_time` | **Sentinel-2** (two dates) | Change detection: shrinking lakes, deforestation, urban growth |

**No paid satellite keys required** — GIBS, Planetary Computer, FIRMS, Esri, and Nominatim are all free and open. You need an Anthropic API key for the agent, and (optionally) a free FIRMS key for live fire detection.

---

## How it works

```
   You ask ──▶  Claude agent  ──▶  picks tools  ──▶  satellite APIs
                     ▲                                 (GIBS · Sentinel-2 ·
                     │      imagery as vision input     Esri · FIRMS · OSM)
                     └─────────────────────────────────────┘
                                  │  streamed reasoning + imagery (SSE)
                                  ▼
              map overlay + grounded answer ──▶ one-click deep-research report (md + PDF)
```

- **Backend** — FastAPI + the Anthropic SDK. The agent loop ([`backend/app/agent.py`](backend/app/agent.py)) runs Claude with tool use and streams every step to the browser over Server-Sent Events. Imagery tools live in [`backend/app/imagery/`](backend/app/imagery/) (one module per source). Query history + reports persist to `backend/data/`; reports render to PDF via `markdown` + `xhtml2pdf`.
- **Frontend** — React + Vite + Tailwind v4 + shadcn/ui, light/dark themes, React Router. Pages: `/` landing · `/how-it-works` · `/impact` · `/benchmark` · `/app` (the engine: a live Leaflet map + a tabbed Query / History / Reports panel).

---

## Evaluation

Parallax ships with a **reproducible benchmark** ([`backend/eval/`](backend/eval/)): a domain-tagged suite of geospatial prompts (Environmental, Consumer, Finance), each with a rubric, graded by an **LLM judge** across four dimensions — *tool selection, groundedness, correctness, clarity*. The runner executes the **full agent** (real satellite tool calls) for each prompt across models.

**Latest run (9 prompts × 3 domains; judge: Claude Sonnet 4.6):**

| Model | Overall (/5) | Avg latency |
|-------|--------------|-------------|
| **Claude Opus 4.8** | **4.22** | 33.7 s |
| Claude Sonnet 4.6 | 3.58 | 29.7 s |

Opus wins every dimension and every domain; Sonnet is marginally faster — a clean quality-vs-latency trade-off. Full results render at **`/benchmark`** (per-dimension, per-domain, and per-prompt with the judge's rationale).

```bash
cd backend
.venv/bin/python eval/run_eval.py                  # Opus vs Sonnet, all cases
.venv/bin/python eval/run_eval.py --models sonnet  # single model
.venv/bin/python eval/run_eval.py --limit 3        # quick subset
```

See [`backend/eval/benchmark.json`](backend/eval/benchmark.json) for the suite and methodology/caveats on the `/benchmark` page.

---

## Setup

**Requirements:** Python 3.12+, Node 18+, an Anthropic API key.

**1. Backend**
```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env          # then edit .env and add your ANTHROPIC_API_KEY
```
Optional: add a free `FIRMS_MAP_KEY` (https://firms.modaps.eosdis.nasa.gov/api/map_key/) to enable live fire detection; without it, fire questions fall back to GIBS imagery.

**2. Frontend**
```bash
cd frontend
npm install
```

**3. Run both** (from the repo root)
```bash
./dev.sh
```
Then open **http://localhost:5180**.

> Run them separately if you prefer:
> - Backend: `cd backend && .venv/bin/uvicorn app.main:app --reload`
> - Frontend: `cd frontend && npm run dev`

---

## Usage

Open `http://localhost:5180`, click **Launch app**, and ask anything about anywhere on Earth. Try:

- *Are there active wildfires near Athens, Greece right now?* — FIRMS fire points
- *How healthy are the crops near Ames, Iowa this season?* — NDVI + stats
- *How has Lake Mead changed since 2016?* — before/after change detection
- *Was it snowing on Mount Fuji in March 2022?* — historical query
- *Show me the Port of Long Beach in detail* — Esri sub-meter imagery
- …then a follow-up like *"compare that to 5 years ago"* — conversation memory

Click **"How the agent reached this answer"** under any response to see the reasoning path, tools used, and sources & limitations. Click **"Generate deep-research report"** to produce a cited PDF + markdown report.

---

## Repository structure

```
parallax/
├── backend/
│   ├── app/
│   │   ├── agent.py        # the agent loop (Claude tool-use, SSE streaming, memory)
│   │   ├── tools.py        # tool schemas + dispatch
│   │   ├── report.py       # deep-research report generation + PDF
│   │   ├── storage.py      # query history + report persistence
│   │   ├── main.py         # FastAPI app + endpoints
│   │   └── imagery/        # one module per data source (gibs, sentinel, esri, firms, …)
│   └── eval/               # benchmark suite, LLM judge, runner, results
├── frontend/
│   └── src/
│       ├── pages/          # Landing, HowItWorks, Impact, Benchmark, Engine
│       └── components/     # map, transcript, agent trace, report viewer, shadcn ui/
├── dev.sh                  # one-command launcher
|-- slides.pdf
└── README.md
```

---

## AI usage disclosure

This project was built in the spirit of the course's "One-Person Frontier Lab": **AI tooling was used heavily and is disclosed in full here.**

- **Implementation tool — Claude Code (Anthropic):** a large portion of the code (backend, frontend, evaluation harness, this README) was written with Claude Code acting as a pair-programmer **under my direction**. I defined the product concept, made the architecture and design decisions, chose the data sources and models, prioritized and sequenced the features across many iterations, ran and tested the live app, and gave the feedback that drove each revision. The development happened as an interactive, iterative process over multiple sessions.

The following models are used inside the product: 

- **Runtime LLM — Claude (Anthropic API):** Claude Opus 4.8 (default) / Sonnet 4.6 powers the agent's tool-use reasoning, the vision-based imagery analysis, and the deep-research report writing.
- **Evaluation judge — Claude Sonnet 4.6:** used as a fixed LLM-as-judge to grade benchmark responses.

No code was forked from an existing project; the repository was built from an empty scaffold. Where third-party data and libraries are used, they are credited below.

---

## Citations & acknowledgements

**Satellite & geospatial data (all free / open):**
- **NASA GIBS** — Global Imagery Browse Services / Worldview Snapshots. https://nasa-gibs.github.io/gibs-api-docs/ · https://wvs.earthdata.nasa.gov/
- **ESA Copernicus Sentinel-2**, accessed via the **Microsoft Planetary Computer** STAC + data API. https://planetarycomputer.microsoft.com/ · https://sentinels.copernicus.eu/
- **Esri World Imagery** — high-resolution basemap mosaic. https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9
- **NASA FIRMS** — Fire Information for Resource Management System. https://firms.modaps.eosdis.nasa.gov/
- **OpenStreetMap Nominatim** — geocoding. © OpenStreetMap contributors. https://nominatim.org/
- Basemap tiles: **CARTO** (https://carto.com/) and **OpenStreetMap**.

**Models & frameworks:**
- **Anthropic Claude** (API + SDK) and **Claude Code**. https://www.anthropic.com/
- Backend: FastAPI, Uvicorn, httpx, NumPy, Markdown, xhtml2pdf, Pydantic, python-dotenv.
- Frontend: React, Vite, Tailwind CSS, shadcn/ui, Radix UI, Leaflet, react-markdown, remark-gfm, lucide-react.

## External resources

- Live data APIs: [GIBS docs](https://nasa-gibs.github.io/gibs-api-docs/) · [Planetary Computer](https://planetarycomputer.microsoft.com/docs/) · [FIRMS API](https://firms.modaps.eosdis.nasa.gov/api/) · [Esri ImageServer export](https://developers.arcgis.com/rest/) · [Nominatim](https://nominatim.org/release-docs/latest/)
- [Anthropic API docs](https://docs.anthropic.com/) · [shadcn/ui](https://ui.shadcn.com/) · [Leaflet](https://leafletjs.com/)

---

## Where to find each rubric item

| Rubric (15 pts) | Where it lives |
|---|---|
| **Problem & Insight** | This README ("Why we built it") + the in-app `/impact` page |
| **Execution & Technical Work** | Slide deck (`./slides.pdf`) and by running the full app — `backend/` + `frontend/`, runnable via `./dev.sh` |
| **Evaluation & Evidence** |Running `backend/eval/` + the `/benchmark` page (Opus vs Sonnet, per-dimension/domain, limitations) |
| **Communication & Presentation** | README + `/how-it-works`, `/impact`, `/benchmark` pages + demo video + `./slides.pdf`|
| **Process, Integrity & Disclosure** | `./slides.pdf`, "AI usage disclosure" + "Citations" above;  (note: code was pasted over from previous github repo's and local dirs so github commit history is not accurate) |

---

*Built as a CS 153 final project — a one-person, AI-accelerated demonstration of agentic tool use over real open geospatial data.*
