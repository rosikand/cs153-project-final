"""Tool schemas exposed to Claude, plus the dispatcher that runs them.

Imagery tools return two things to the agent loop:
  - a base64 image block, fed to Claude so it can *see* and analyse the scene
  - a UI event payload (url + bbox + metadata) the frontend overlays on the map.
"""
from __future__ import annotations

import base64

from .imagery import (
    esri,
    firms,
    gibs,
    geocode as geocode_mod,
    sentinel,
    temporal,
    vegetation,
)

TOOLS = [
    {
        "name": "geocode_location",
        "description": (
            "Resolve a place name, address, or landmark anywhere on Earth into "
            "latitude/longitude and a bounding box. ALWAYS call this first to "
            "locate the area a question is about before fetching imagery or fires."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Place name or description, e.g. 'Lake Mead, Nevada' or 'Amazon rainforest near Manaus'.",
                }
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_realtime_imagery",
        "description": (
            "Fetch NASA GIBS daily satellite imagery for a bounding box. Defaults to "
            "yesterday (near-real-time) but ALSO serves the full historical archive — "
            "pass `date` to get imagery for ANY past day (e.g. '2022-03-15'). Coarse "
            "resolution (~250m-1km). USE THIS for time-sensitive or HISTORICAL "
            "large-scale phenomena: snow cover on a given date, smoke plumes, floods, "
            "dust storms, hurricanes, volcanic activity, algal blooms. For dates "
            "before ~2016 use base='truecolor_modis' (VIIRS archive starts later). "
            "For wildfire questions prefer get_active_fires; use base='falsecolor_viirs' "
            "to reveal burn scars."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "bbox": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "[min_lon, min_lat, max_lon, max_lat] from geocode_location.",
                },
                "date": {
                    "type": "string",
                    "description": "Optional ISO date YYYY-MM-DD. Omit for most recent available (yesterday).",
                },
                "base": {
                    "type": "string",
                    "enum": ["truecolor_viirs", "truecolor_modis", "falsecolor_viirs"],
                    "description": "Base layer. 'falsecolor_viirs' is best for seeing burn scars / fire.",
                },
                "overlays": {
                    "type": "array",
                    "items": {"type": "string", "enum": ["fires", "fires_modis"]},
                    "description": "Optional overlays. Use 'fires' to mark active thermal anomalies.",
                },
            },
            "required": ["bbox"],
        },
    },
    {
        "name": "get_highres_imagery",
        "description": (
            "Fetch high-resolution (~10m) Sentinel-2 true-color imagery for a "
            "bounding box from the Microsoft Planetary Computer. Finds the most "
            "recent low-cloud scene (revisit is ~5 days, so it may be a few days "
            "old). USE THIS for detailed analysis where you need to resolve fields, "
            "urban areas, water bodies, coastlines, deforestation edges, or "
            "infrastructure. NOT same-day, so prefer get_realtime_imagery for "
            "active/breaking events."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "bbox": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "[min_lon, min_lat, max_lon, max_lat] from geocode_location.",
                },
                "datetime_range": {
                    "type": "string",
                    "description": "Optional STAC range 'YYYY-MM-DD/YYYY-MM-DD'. Omit for most recent scenes.",
                },
                "max_cloud": {
                    "type": "integer",
                    "description": "Max acceptable cloud cover percent (default 20). Raise if no scenes found.",
                },
            },
            "required": ["bbox"],
        },
    },
    {
        "name": "get_basemap_imagery",
        "description": (
            "Fetch Esri World Imagery — a high-resolution (often sub-meter) static "
            "satellite mosaic — for a bounding box. Sharp enough to resolve buildings, "
            "roads, runways, ships, stadiums. NOT dated/real-time (it's a mosaic months "
            "to a few years old, varying by place), so do NOT use it for time-sensitive "
            "or historical-date questions. USE THIS when the question is about fine "
            "spatial DETAIL and current freshness doesn't matter, where Sentinel-2's "
            "10m is too coarse."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "bbox": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "[min_lon, min_lat, max_lon, max_lat] from geocode_location.",
                }
            },
            "required": ["bbox"],
        },
    },
    {
        "name": "get_active_fires",
        "description": (
            "Get NASA FIRMS active-fire detections (real thermal hotspots from "
            "VIIRS) within a bounding box over the last 1-10 days. Returns precise "
            "fire points with confidence and Fire Radiative Power. USE THIS as the "
            "primary tool for ANY wildfire / active-fire question — it gives exact "
            "counts and locations, not just a picture. Pair it with "
            "get_realtime_imagery if the user wants to see smoke or burn scars."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "bbox": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "[min_lon, min_lat, max_lon, max_lat] from geocode_location.",
                },
                "days": {
                    "type": "integer",
                    "description": "Look-back window in days (1-10, default 1 = last 24h).",
                },
            },
            "required": ["bbox"],
        },
    },
    {
        "name": "get_vegetation_index",
        "description": (
            "Compute NDVI (vegetation health index) for a bounding box from "
            "Sentinel-2 near-infrared/red bands. Returns a colormapped NDVI image "
            "(red=stressed/bare -> green=dense healthy vegetation) PLUS real numeric "
            "statistics (mean/min/max NDVI and the percent of area that is healthy "
            "vegetation). USE THIS for crop health, drought stress, vegetation "
            "vigor, or green-space questions — it is quantitative, not just visual."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "bbox": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "[min_lon, min_lat, max_lon, max_lat] from geocode_location.",
                },
                "datetime_range": {
                    "type": "string",
                    "description": "Optional STAC range 'YYYY-MM-DD/YYYY-MM-DD'. Omit for most recent scene.",
                },
                "max_cloud": {
                    "type": "integer",
                    "description": "Max acceptable cloud cover percent (default 20).",
                },
            },
            "required": ["bbox"],
        },
    },
    {
        "name": "compare_over_time",
        "description": (
            "Fetch two Sentinel-2 true-color scenes of the SAME area near two "
            "different dates so you can compare them and describe what changed. "
            "USE THIS for any change-over-time question: shrinking reservoirs/lakes, "
            "glacier retreat, deforestation, urban expansion, coastline change, "
            "post-disaster damage. The actual scene dates returned may differ "
            "slightly from the requested dates (Sentinel-2 revisit ~5 days; for "
            "dates before mid-2015 there is no Sentinel-2 data)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "bbox": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "[min_lon, min_lat, max_lon, max_lat] from geocode_location.",
                },
                "date_a": {"type": "string", "description": "First (earlier) target date YYYY-MM-DD."},
                "date_b": {"type": "string", "description": "Second (later) target date YYYY-MM-DD."},
            },
            "required": ["bbox", "date_a", "date_b"],
        },
    },
]


def _image_block(media_type: str, b64: str) -> dict:
    return {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}}


async def run_tool(name: str, args: dict):
    """Execute a tool. Returns (text_summary, payload).

    payload["kind"] tells the agent loop how to forward it to the UI and what
    content blocks to hand back to Claude. Image bytes are base64-encoded under
    "b64" (or per-frame) and stripped before reaching the browser.
    """
    if name == "geocode_location":
        loc = await geocode_mod.geocode(args["query"])
        summary = (
            f"Location: {loc['name']}\n"
            f"Center: {loc['lat']:.4f}, {loc['lon']:.4f}\n"
            f"BBox [min_lon,min_lat,max_lon,max_lat]: {loc['bbox']}"
        )
        return summary, {"kind": "location", **loc}

    if name == "get_active_fires":
        result = await firms.get_active_fires(bbox=args["bbox"], days=args.get("days", 1))
        n = result["count"]
        if n == 0:
            summary = (
                f"{result['source']}: NO active fire detections in this area. "
                "That means no thermal hotspots were detected by VIIRS here in the window."
            )
        else:
            sample = result["fires"][:8]
            lines = "\n".join(
                f"  - {f['lat']:.3f},{f['lon']:.3f} confidence={f['confidence']} FRP={f['frp']}MW {f['acq_date']} {f['acq_time']}"
                for f in sample
            )
            summary = (
                f"{result['source']}: {n} active fire detection(s)"
                + (" (truncated to strongest)" if result["truncated"] else "")
                + f".\nSample:\n{lines}"
            )
        return summary, {"kind": "fires", **result}

    if name == "get_vegetation_index":
        result = await vegetation.get_vegetation_index(
            bbox=args["bbox"],
            datetime_range=args.get("datetime_range"),
            max_cloud=args.get("max_cloud", 20),
        )
        s = result["stats"]
        b64 = base64.b64encode(result["image_bytes"]).decode("ascii")
        summary = (
            f"NDVI from {result['source']} on {result['date']} "
            f"(cloud {result.get('cloud_cover', 0):.0f}%).\n"
            f"Mean NDVI {s['mean']}, range {s['min']}..{s['max']}, "
            f"{s['healthy_pct']}% of the area is dense healthy vegetation (NDVI>0.5).\n"
            f"Embeddable NDVI image URL (use in markdown reports): {result['url']}\n"
            "Colormap attached: red=bare/stressed, yellow=moderate, green=healthy."
        )
        return summary, {
            "kind": "imagery",
            "variant": "ndvi",
            "source": result["source"],
            "date": result["date"],
            "cloud_cover": result.get("cloud_cover"),
            "url": result["url"],
            "bbox": result["bbox"],
            "media_type": result["media_type"],
            "stats": s,
            "b64": b64,
        }

    if name == "compare_over_time":
        result = await temporal.compare_over_time(
            bbox=args["bbox"], date_a=args["date_a"], date_b=args["date_b"]
        )
        frames = result["frames"]
        ui_frames = [
            {k: f[k] for k in ("date", "requested", "cloud_cover", "url")} for f in frames
        ]
        summary = (
            f"{result['source']}. Two scenes for comparison (oldest first):\n"
            + "\n".join(
                f"  {i+1}. {f['date']} (requested {f['requested']}, cloud {f.get('cloud_cover', 0):.0f}%)"
                f" — embeddable URL: {f['url']}"
                for i, f in enumerate(frames)
            )
            + "\nBoth images attached below in order — compare them and describe what changed."
        )
        payload = {
            "kind": "comparison",
            "source": result["source"],
            "bbox": result["bbox"],
            "frames": ui_frames,
            "image_blocks": [
                _image_block(f["media_type"], base64.b64encode(f["image_bytes"]).decode("ascii"))
                for f in frames
            ],
        }
        return summary, payload

    # Single-image imagery tools (GIBS realtime, Sentinel highres).
    if name == "get_realtime_imagery":
        result = await gibs.fetch(
            bbox=args["bbox"],
            date=args.get("date"),
            base=args.get("base", "truecolor_viirs"),
            overlays=args.get("overlays"),
        )
    elif name == "get_highres_imagery":
        result = await sentinel.fetch(
            bbox=args["bbox"],
            datetime_range=args.get("datetime_range"),
            max_cloud=args.get("max_cloud", 20),
        )
    elif name == "get_basemap_imagery":
        result = await esri.fetch(bbox=args["bbox"])
    else:
        return f"Unknown tool: {name}", None

    b64 = base64.b64encode(result["image_bytes"]).decode("ascii")
    cloud = result.get("cloud_cover")
    summary = (
        f"Imagery acquired from {result['source']}.\n"
        f"Date: {result.get('date', 'recent')}"
        + (f" | Cloud cover: {cloud:.0f}%" if cloud is not None else "")
        + f"\nBBox: {result['bbox']}\n"
        f"Embeddable image URL (use in markdown reports): {result['url']}\n"
        "The image is attached below — analyse it directly to answer the question."
    )
    return summary, {
        "kind": "imagery",
        "source": result["source"],
        "date": result.get("date"),
        "cloud_cover": cloud,
        "url": result["url"],
        "bbox": result["bbox"],
        "media_type": result["media_type"],
        "b64": b64,
    }
