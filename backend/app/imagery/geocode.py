"""Geocoding: turn a place name into coordinates + a bounding box.

Uses the free OpenStreetMap Nominatim service (no API key required).
"""
from __future__ import annotations

import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Nominatim asks every client to identify itself with a User-Agent.
HEADERS = {"User-Agent": "Parallax-GeospatialEngine/1.0 (course-project)"}


async def geocode(query: str) -> dict:
    """Resolve a place name to lat/lon and a bounding box.

    Returns a dict with: name, lat, lon, bbox ([minlon, minlat, maxlon, maxlat]).
    Raises ValueError if the place can't be found.
    """
    params = {"q": query, "format": "json", "limit": 1, "polygon_geojson": 0}
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(NOMINATIM_URL, params=params, headers=HEADERS)
        resp.raise_for_status()
        results = resp.json()

    if not results:
        raise ValueError(f"Could not find a location matching '{query}'.")

    r = results[0]
    lat, lon = float(r["lat"]), float(r["lon"])
    # Nominatim bbox order is [minlat, maxlat, minlon, maxlon] as strings.
    s, n, w, e = (float(x) for x in r["boundingbox"])
    bbox = [w, s, e, n]  # standard GeoJSON order: [minlon, minlat, maxlon, maxlat]

    # Some results (a single point of interest) have a zero-area bbox. Pad it so
    # there is actually something to image — roughly a few km on a side.
    if (e - w) < 0.05 or (n - s) < 0.05:
        pad = 0.15
        bbox = [lon - pad, lat - pad, lon + pad, lat + pad]

    return {
        "name": r.get("display_name", query),
        "lat": lat,
        "lon": lon,
        "bbox": bbox,
    }
