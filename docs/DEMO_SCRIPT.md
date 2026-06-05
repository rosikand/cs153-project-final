# Parallax Demo Script

## 0:00–0:25 — Problem

“Satellite data is powerful, but using it normally means knowing which sensor,
catalog, date, projection, and environmental feed to query. Parallax lets a
user ask the Earth a question in plain language.”

Open **How it works** and point to the six-stage agent loop. Briefly show the
architecture diagram, then move to **Explore**.

## 0:25–1:05 — Live Query

Use:

> Are there active wildfires near Los Angeles?

Click **Run Query** and narrate the visible agent trace:

1. It identifies wildfire intent and selects a 250 km observation radius.
2. It resolves Los Angeles to coordinates.
3. It gathers a dated NASA MODIS image, weather, and NASA event records in
   parallel.
4. It synthesizes an answer and exposes its confidence and caveats.

## 1:05–1:45 — Evidence

Show:

- the map moving to Southern California
- the dated NASA satellite layer
- the green area-of-interest ring
- orange natural-event markers
- the image date and 250 m resolution
- current cloud cover
- the nearest NASA event

Say: “This is not the model recalling a fact. It is an answer assembled from
evidence acquired for this question.”

## 1:45–2:20 — Agentic and Trustworthy

Scroll to the agent trace and provenance.

“Every step is visible. The system tells us whether OpenAI vision or the
non-AI evidence fallback produced the assessment. It also makes the important
limitation explicit: near-real-time satellite imagery is not live video, and
MODIS cannot support street-level claims.”

## 2:20–2:45 — Generality

Click two example prompts without necessarily running both:

- flooding near Jakarta
- earthquake activity around Tokyo

Explain that the planner changes the intent, radius, evidence feeds, and answer
structure while keeping one interface.

## 2:45–3:15 — History and Research Report

Open **History** to show that the investigation and original image were saved.
Reopen the query, expand the agent trace, and point to the exact image passed
to the model.

Click **Generate deep research report**. In the Reports reader, show the
rendered Markdown and the Markdown/PDF download buttons.

## 3:15–3:30 — Close

“The prototype proves the end-to-end product loop: natural language to
observation plan, live data acquisition, multimodal analysis, and an
explainable answer. The next step is temporal change detection with Sentinel-2
and radar imagery.”

## Backup Plan

If external network access is unreliable:

1. Keep the default Los Angeles prompt ready.
2. Start the app before presenting so the browser and dependencies are loaded.
3. Explain that `Evidence fallback` mode keeps live data available when the AI
   credential is not configured.
4. Use the architecture diagram in `README.md` while the query completes.

The application degrades when individual providers fail, so a missing weather
response does not collapse the entire workflow.
