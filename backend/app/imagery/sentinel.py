"""Sentinel-2 high-resolution imagery via Microsoft Planetary Computer.

Searches the open STAC catalog for low-cloud Sentinel-2 scenes and renders
true-color (or arbitrary band-expression) PNGs cropped to a query bounding box
using Planetary Computer's data (TiTiler) API. No API key required.

Shared helpers here (`find_scene`, `find_scene_near`, `render_url`) are reused
by the NDVI and change-detection features.

Good for: agriculture / crop health, urban growth, deforestation, water bodies
and reservoir levels, coastlines, mining, anything needing ~10m detail.
Trade-off vs. GIBS: ~5 day revisit, so "most recent" may be several days old.
"""
from __future__ import annotations

import datetime as dt

import httpx

STAC_SEARCH = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
DATA_API = "https://planetarycomputer.microsoft.com/api/data/v1"
COLLECTION = "sentinel-2-l2a"


async def find_scene(
    client: httpx.AsyncClient,
    bbox: list[float],
    datetime_range: str | None = None,
    max_cloud: int = 20,
) -> dict:
    """Return the least-cloudy Sentinel-2 scene covering bbox (STAC feature)."""
    body: dict = {
        "collections": [COLLECTION],
        "bbox": bbox,
        "query": {"eo:cloud_cover": {"lt": max_cloud}},
        "sortby": [{"field": "eo:cloud_cover", "direction": "asc"}],
        "limit": 12,
    }
    if datetime_range:
        body["datetime"] = datetime_range

    resp = await client.post(STAC_SEARCH, json=body)
    resp.raise_for_status()
    features = resp.json().get("features", [])
    if not features:
        raise RuntimeError(
            "No clear Sentinel-2 scenes found for this area"
            + (f" in {datetime_range}" if datetime_range else "")
            + ". Try widening the date range or raising the cloud threshold."
        )
    return features[0]


async def find_scene_near(
    client: httpx.AsyncClient,
    bbox: list[float],
    date: str,
    window_days: int = 60,
    max_cloud: int = 40,
) -> dict:
    """Find the best Sentinel-2 scene within +/- window_days of a target date."""
    target = dt.date.fromisoformat(date)
    start = (target - dt.timedelta(days=window_days)).isoformat()
    end = (target + dt.timedelta(days=window_days)).isoformat()
    return await find_scene(client, bbox, f"{start}/{end}", max_cloud)


def render_url(
    item_id: str,
    bbox: list[float],
    width: int = 720,
    height: int = 720,
    expression: str | None = None,
    colormap_name: str | None = None,
    rescale: str | None = None,
    fmt: str = "png",
) -> str:
    """Build a Planetary Computer data-API render URL for an item over a bbox.

    Without `expression`, renders the true-color 'visual' asset. With an
    `expression` (e.g. an NDVI band-math expression) plus colormap/rescale,
    renders a derived colormapped product.
    """
    minlon, minlat, maxlon, maxlat = bbox
    base = (
        f"{DATA_API}/item/bbox/{minlon},{minlat},{maxlon},{maxlat}/{width}x{height}.{fmt}"
        f"?collection={COLLECTION}&item={item_id}"
    )
    if expression:
        url = f"{base}&expression={expression}&asset_as_band=true&nodata=0"
        if rescale:
            url += f"&rescale={rescale}"
        if colormap_name:
            url += f"&colormap_name={colormap_name}"
        return url
    return f"{base}&assets=visual&asset_bidx=visual|1,2,3&nodata=0"


def _meta(item: dict) -> tuple[str, float | None]:
    """Extract (acquisition date, cloud cover) from a STAC feature."""
    props = item.get("properties", {})
    return props.get("datetime", "")[:10], props.get("eo:cloud_cover")


async def fetch(
    bbox: list[float],
    datetime_range: str | None = None,
    max_cloud: int = 20,
    width: int = 720,
    height: int = 720,
) -> dict:
    """Find and render the best recent Sentinel-2 true-color scene for a bbox."""
    async with httpx.AsyncClient(timeout=40) as client:
        item = await find_scene(client, bbox, datetime_range, max_cloud)
        item_id = item["id"]
        date, cloud = _meta(item)
        url = render_url(item_id, bbox, width, height)
        img = await client.get(url)
        img.raise_for_status()

    return {
        "image_bytes": img.content,
        "media_type": "image/png",
        "url": url,
        "date": date,
        "cloud_cover": cloud,
        "source": "Sentinel-2 L2A (Planetary Computer, ~10m)",
        "item_id": item_id,
        "bbox": bbox,
    }
