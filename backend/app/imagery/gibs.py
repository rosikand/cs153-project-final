"""NASA GIBS near-real-time imagery.

Pulls daily global imagery from NASA's Global Imagery Browse Services via the
Worldview Snapshots API. No API key required. Imagery is available with roughly
a 1-2 day latency, so the engine defaults to the most recent likely-available day.

Good for: wildfires, smoke, floods, dust storms, large weather systems, snow
cover, algal blooms, seasonal/large-scale change. Resolution is coarse
(~250m-1km) so it cannot resolve individual buildings.
"""
from __future__ import annotations

import datetime as dt

import httpx

SNAPSHOT_URL = "https://wvs.earthdata.nasa.gov/api/v1/snapshot"

# Curated, demo-friendly GIBS layers. The agent picks a base layer and may stack
# an overlay (e.g. thermal anomalies for fire questions) on top of true color.
BASE_LAYERS = {
    "truecolor_viirs": "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    "truecolor_modis": "MODIS_Terra_CorrectedReflectance_TrueColor",
    "falsecolor_viirs": "VIIRS_SNPP_CorrectedReflectance_BandsM11I2I1",  # burn scars / fire
}
OVERLAY_LAYERS = {
    "fires": "VIIRS_SNPP_Thermal_Anomalies_375m_All",
    "fires_modis": "MODIS_Combined_Thermal_Anomalies_All",
}


def _recent_date(days_ago: int) -> str:
    return (dt.date.today() - dt.timedelta(days=days_ago)).isoformat()


def build_url(
    bbox: list[float],
    date: str | None = None,
    base: str = "truecolor_viirs",
    overlays: list[str] | None = None,
    width: int = 720,
    height: int = 720,
) -> tuple[str, str]:
    """Build a GIBS snapshot URL. Returns (url, resolved_date)."""
    if date is None:
        # Yesterday is the safest "near-real-time" default given ingest latency.
        date = _recent_date(1)

    layers = [BASE_LAYERS.get(base, BASE_LAYERS["truecolor_viirs"])]
    for ov in overlays or []:
        if ov in OVERLAY_LAYERS:
            layers.append(OVERLAY_LAYERS[ov])

    minlon, minlat, maxlon, maxlat = bbox
    # Snapshot BBOX is in "minlat,minlon,maxlat,maxlon" order for EPSG:4326.
    params = {
        "REQUEST": "GetSnapshot",
        "LAYERS": ",".join(layers),
        "CRS": "EPSG:4326",
        "TIME": date,
        "BBOX": f"{minlat},{minlon},{maxlat},{maxlon}",
        "FORMAT": "image/jpeg",
        "WIDTH": str(width),
        "HEIGHT": str(height),
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{SNAPSHOT_URL}?{query}", date


async def fetch(
    bbox: list[float],
    date: str | None = None,
    base: str = "truecolor_viirs",
    overlays: list[str] | None = None,
) -> dict:
    """Fetch a near-real-time GIBS image for a bbox.

    Returns dict: image_bytes, media_type, url, date, source, layers, bbox.
    If the requested date has no imagery yet, falls back to a couple of earlier
    days so the demo never shows a blank frame.
    """
    candidate_dates = [date] if date else [_recent_date(d) for d in (1, 2, 3)]

    last_url = ""
    for d in candidate_dates:
        url, resolved = build_url(bbox, d, base, overlays)
        last_url = url
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
        if resp.status_code == 200 and len(resp.content) > 3000:
            # >3KB heuristic: a mostly-empty/black frame compresses tiny.
            return {
                "image_bytes": resp.content,
                "media_type": "image/jpeg",
                "url": url,
                "date": resolved,
                "source": "NASA GIBS (near-real-time)",
                "layers": [base] + (overlays or []),
                "bbox": bbox,
            }

    raise RuntimeError(
        f"No near-real-time GIBS imagery available for this area/date. URL tried: {last_url}"
    )
