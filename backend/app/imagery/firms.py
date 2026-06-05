"""NASA FIRMS active-fire detections.

FIRMS (Fire Information for Resource Management System) publishes near-real-time
active-fire/thermal-anomaly detections from VIIRS and MODIS, typically within a
few hours of satellite overpass. Each detection is a point with location,
confidence, brightness temperature, and Fire Radiative Power (FRP).

This gives concrete, countable fire locations — far better for "is there a fire
near X right now" than eyeballing a coarse thermal overlay.

Requires a free FIRMS map key (instant signup):
    https://firms.modaps.eosdis.nasa.gov/api/map_key/
Set it as FIRMS_MAP_KEY in backend/.env.
"""
from __future__ import annotations

import csv
import io
import os

import httpx

AREA_CSV = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
# VIIRS S-NPP has good sensitivity and global near-real-time coverage.
DEFAULT_SOURCE = "VIIRS_SNPP_NRT"

# VIIRS confidence is categorical (low / nominal / high); MODIS is 0-100.
_CONF_LABEL = {"l": "low", "n": "nominal", "h": "high"}


async def get_active_fires(
    bbox: list[float],
    days: int = 1,
    source: str = DEFAULT_SOURCE,
    max_points: int = 400,
) -> dict:
    """Fetch active-fire detections within a bbox over the last `days` (1-10).

    Returns dict: fires (list of points), count, source, days, bbox.
    Raises RuntimeError with guidance if no map key is configured.
    """
    map_key = os.getenv("FIRMS_MAP_KEY")
    if not map_key:
        raise RuntimeError(
            "FIRMS_MAP_KEY is not set. Get a free key instantly at "
            "https://firms.modaps.eosdis.nasa.gov/api/map_key/ and add it to backend/.env."
        )

    days = max(1, min(int(days), 10))
    minlon, minlat, maxlon, maxlat = bbox
    # FIRMS area endpoint expects west,south,east,north — same order as our bbox.
    area = f"{minlon},{minlat},{maxlon},{maxlat}"
    url = f"{AREA_CSV}/{map_key}/{source}/{area}/{days}"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        text = resp.text

    # The API returns a plain-text error (not CSV) for bad keys / no data.
    if text.lstrip().lower().startswith(("invalid", "error")):
        raise RuntimeError(f"FIRMS error: {text.strip()[:200]}")

    fires: list[dict] = []
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        try:
            lat = float(row["latitude"])
            lon = float(row["longitude"])
        except (KeyError, ValueError):
            continue
        conf_raw = (row.get("confidence") or "").strip()
        confidence = _CONF_LABEL.get(conf_raw.lower(), conf_raw)
        fires.append(
            {
                "lat": lat,
                "lon": lon,
                "confidence": confidence,
                # bright_ti4 (VIIRS) or brightness (MODIS), in Kelvin.
                "brightness": row.get("bright_ti4") or row.get("brightness"),
                "frp": row.get("frp"),  # Fire Radiative Power (MW)
                "acq_date": row.get("acq_date"),
                "acq_time": row.get("acq_time"),
                "daynight": row.get("daynight"),
            }
        )

    # Cap the number of points so the map and the model summary stay manageable;
    # keep the most intense fires (highest FRP) when truncating.
    truncated = False
    if len(fires) > max_points:
        fires.sort(key=lambda f: float(f["frp"] or 0), reverse=True)
        fires = fires[:max_points]
        truncated = True

    return {
        "fires": fires,
        "count": len(fires),
        "truncated": truncated,
        "source": f"NASA FIRMS ({source}, last {days}d)",
        "days": days,
        "bbox": bbox,
    }
