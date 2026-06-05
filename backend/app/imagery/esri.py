"""Esri World Imagery (high-resolution static basemap).

Esri's World Imagery is a global mosaic reaching sub-meter resolution in many
populated areas — sharp enough to resolve individual buildings, roads, ships,
and aircraft. It is NOT dated/real-time: it's a stitched mosaic of the best
available imagery (months to a few years old, varying by location). No API key
required for the export endpoint.

Use it when the question is about fine detail and freshness doesn't matter
(layout of a port, an airport, a stadium, urban form), where Sentinel-2's 10m is
too coarse.
"""
from __future__ import annotations

import httpx

EXPORT_URL = (
    "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export"
)


def build_url(bbox: list[float], width: int = 768, height: int = 768) -> str:
    minlon, minlat, maxlon, maxlat = bbox
    params = {
        "bbox": f"{minlon},{minlat},{maxlon},{maxlat}",
        "bboxSR": "4326",
        "imageSR": "4326",
        "size": f"{width},{height}",
        "format": "jpg",
        "f": "image",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{EXPORT_URL}?{query}"


async def fetch(bbox: list[float], width: int = 768, height: int = 768) -> dict:
    """Fetch a high-resolution Esri World Imagery crop for a bbox."""
    url = build_url(bbox, width, height)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    if len(resp.content) < 2000:
        raise RuntimeError("Esri World Imagery returned no usable image for this area.")
    return {
        "image_bytes": resp.content,
        "media_type": "image/jpeg",
        "url": url,
        "date": None,
        "source": "Esri World Imagery (high-res mosaic)",
        "bbox": bbox,
    }
