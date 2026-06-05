"""Temporal change detection with Sentinel-2.

Fetches the best low-cloud Sentinel-2 scene near each of two target dates over
the same bounding box, so the agent can compare them with vision and the UI can
show a before/after swipe. Powers questions like "how has this reservoir /
glacier / city changed since 2020?".
"""
from __future__ import annotations

import httpx

from . import sentinel


async def compare_over_time(
    bbox: list[float],
    date_a: str,
    date_b: str,
    max_cloud: int = 40,
) -> dict:
    """Render two true-color scenes near date_a and date_b for the same bbox.

    Returns dict with a `frames` list (chronological), each having image_bytes,
    url, date, cloud_cover. Dates are the ACTUAL scene dates found, which may
    differ from the requested targets (Sentinel-2 revisits every ~5 days).
    """
    async with httpx.AsyncClient(timeout=60) as client:
        frames = []
        for target in (date_a, date_b):
            item = await sentinel.find_scene_near(client, bbox, target, max_cloud=max_cloud)
            item_id = item["id"]
            date, cloud = sentinel._meta(item)
            url = sentinel.render_url(item_id, bbox)
            img = await client.get(url)
            img.raise_for_status()
            frames.append(
                {
                    "requested": target,
                    "date": date,
                    "cloud_cover": cloud,
                    "url": url,
                    "image_bytes": img.content,
                    "media_type": "image/png",
                    "item_id": item_id,
                }
            )

    # Present oldest -> newest regardless of argument order.
    frames.sort(key=lambda f: f["date"])
    return {
        "frames": frames,
        "source": "Sentinel-2 L2A change detection (Planetary Computer, ~10m)",
        "bbox": bbox,
    }
