"""NDVI vegetation-health analysis from Sentinel-2.

NDVI (Normalized Difference Vegetation Index) = (NIR - Red) / (NIR + Red),
computed from Sentinel-2 bands B08 (near-infrared) and B04 (red). It ranges
from -1 to 1: water/built-up are near or below 0, sparse/stressed vegetation is
low-positive, and dense healthy vegetation approaches 1.

We render an NDVI colormap (red=stressed -> green=healthy) for the map and
Claude's vision, and separately pull a small raw NDVI array to compute real
mean/min/max and a "healthy vegetation" fraction.
"""
from __future__ import annotations

import io

import httpx
import numpy as np

from . import sentinel

# NDVI expression over Sentinel-2 bands; '+' must be URL-encoded as %2B.
NDVI_EXPR = "(B08-B04)/(B08%2BB04)"
HEALTHY_THRESHOLD = 0.5  # NDVI above this is typically dense, healthy vegetation.


async def get_vegetation_index(
    bbox: list[float],
    datetime_range: str | None = None,
    max_cloud: int = 20,
) -> dict:
    """Render an NDVI colormap for a bbox and compute summary statistics."""
    async with httpx.AsyncClient(timeout=40) as client:
        item = await sentinel.find_scene(client, bbox, datetime_range, max_cloud)
        item_id = item["id"]
        date, cloud = sentinel._meta(item)

        # Colormapped PNG for display + vision.
        png_url = sentinel.render_url(
            item_id, bbox, expression=NDVI_EXPR, colormap_name="rdylgn", rescale="-1,1"
        )
        png = await client.get(png_url)
        png.raise_for_status()

        # Raw NDVI array (small) for real statistics.
        npy_url = sentinel.render_url(
            item_id, bbox, width=96, height=96, expression=NDVI_EXPR, fmt="npy"
        )
        npy_resp = await client.get(npy_url)
        npy_resp.raise_for_status()

    stats = _compute_stats(npy_resp.content)

    return {
        "image_bytes": png.content,
        "media_type": "image/png",
        "url": png_url,
        "date": date,
        "cloud_cover": cloud,
        "source": "Sentinel-2 NDVI (Planetary Computer, ~10m)",
        "item_id": item_id,
        "bbox": bbox,
        "stats": stats,
    }


def _compute_stats(npy_bytes: bytes) -> dict:
    """Compute NDVI mean/min/max and healthy fraction from a TiTiler .npy array.

    TiTiler returns shape (bands+1, H, W) where the last band is a 0/255 mask.
    """
    arr = np.load(io.BytesIO(npy_bytes))
    data = arr[0].astype("float32")
    mask = arr[-1].astype(bool) if arr.shape[0] > 1 else np.ones(data.shape, bool)
    valid = data[mask]
    valid = valid[np.isfinite(valid)]
    if valid.size == 0:
        return {"mean": None, "min": None, "max": None, "healthy_pct": None}
    return {
        "mean": round(float(valid.mean()), 3),
        "min": round(float(valid.min()), 3),
        "max": round(float(valid.max()), 3),
        "healthy_pct": round(float((valid > HEALTHY_THRESHOLD).mean() * 100), 1),
    }
