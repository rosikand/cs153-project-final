import test from "node:test";
import assert from "node:assert/strict";
import {
  createFallbackAnswer,
  extractLocationText,
  filterEventsForIntent,
  inferIntent
} from "../server/engine.js";
import {
  buildImageryUrls,
  distanceKm,
  freshnessLabel,
  imageryBounds,
  parseFirmsHotspots,
  sourceDateAgeDays
} from "../server/providers.js";

test("infers wildfire intent", () => {
  assert.equal(
    inferIntent("Are there active wildfires near Los Angeles?").key,
    "wildfire"
  );
});

test("extracts a location after a spatial preposition", () => {
  assert.equal(
    extractLocationText("Is there flooding near Jakarta right now?"),
    "Jakarta"
  );
});

test("computes realistic distance between Los Angeles and San Francisco", () => {
  const distance = distanceKm(34.0522, -118.2437, 37.7749, -122.4194);
  assert.ok(distance > 540 && distance < 570);
});

test("builds bounded imagery requests", () => {
  const bounds = imageryBounds(34.05, -118.24, 100);
  assert.ok(bounds.south < 34.05);
  assert.ok(bounds.north > 34.05);

  const imagery = buildImageryUrls({
    lat: 34.05,
    lon: -118.24,
    radiusKm: 100,
    date: "2026-06-03"
  });
  assert.match(imagery.sourceUrl, /REQUEST=GetMap/);
  assert.match(imagery.tileUrl, /2026-06-03/);
});

test("fallback answer is explicit that AI is not configured", () => {
  const answer = createFallbackAnswer({
    location: { name: "Los Angeles, California", lat: 34, lon: -118 },
    intent: inferIntent("wildfire near Los Angeles"),
    weather: {
      temperature: 25,
      temperatureUnit: "°C",
      cloudCover: 10,
      windSpeed: 8,
      windSpeedUnit: "km/h"
    },
    events: [],
    earthquakes: [],
    imagery: {
      date: "2026-06-03",
      label: "Terra / MODIS",
      freshness: "1 day old"
    }
  });
  assert.match(answer.caveats[0], /AI is not configured/);
  assert.ok(answer.confidence > 50);
});

test("filters natural events to the selected observation intent", () => {
  const events = [
    { title: "A", category: "Wildfires" },
    { title: "B", category: "Severe Storms" }
  ];
  assert.deepEqual(filterEventsForIntent(events, "wildfire"), [events[0]]);
  assert.deepEqual(filterEventsForIntent(events, "general"), events);
});

test("labels imagery freshness from source date", () => {
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(sourceDateAgeDays(today), 0);
  assert.equal(freshnessLabel(today), "Today");
});

test("parses and filters NASA FIRMS hotspot rows", () => {
  const csv = [
    "latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,frp",
    "34.10,-118.20,2026-06-05,0123,N21,VIIRS,h,14.5",
    "40.00,-120.00,2026-06-05,0124,N21,VIIRS,n,2.1"
  ].join("\n");
  const events = parseFirmsHotspots(csv, 34.05, -118.24, 100);
  assert.equal(events.length, 1);
  assert.equal(events[0].source, "NASA FIRMS");
  assert.equal(events[0].observedAt, "2026-06-05T01:23:00Z");
});
