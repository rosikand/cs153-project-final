import sharp from "sharp";
import { parse } from "csv-parse/sync";

const NASA_GIBS_WMS =
  "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const NASA_GIBS_WMTS =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

export const IMAGERY_SENSORS = [
  {
    id: "noaa-21-viirs",
    sensor: "VIIRS",
    platform: "NOAA-21",
    label: "NOAA-21 / VIIRS",
    layer: "VIIRS_NOAA21_CorrectedReflectance_TrueColor",
    resolution: "375 m-class regional imagery",
    cadence: "Daily polar-orbiting overpass"
  },
  {
    id: "noaa-20-viirs",
    sensor: "VIIRS",
    platform: "NOAA-20",
    label: "NOAA-20 / VIIRS",
    layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    resolution: "375 m-class regional imagery",
    cadence: "Daily polar-orbiting overpass"
  },
  {
    id: "suomi-npp-viirs",
    sensor: "VIIRS",
    platform: "Suomi NPP",
    label: "Suomi NPP / VIIRS",
    layer: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    resolution: "375 m-class regional imagery",
    cadence: "Daily polar-orbiting overpass"
  },
  {
    id: "aqua-modis",
    sensor: "MODIS",
    platform: "Aqua",
    label: "Aqua / MODIS",
    layer: "MODIS_Aqua_CorrectedReflectance_TrueColor",
    resolution: "250 m-class regional imagery",
    cadence: "Daily polar-orbiting overpass"
  },
  {
    id: "terra-modis",
    sensor: "MODIS",
    platform: "Terra",
    label: "Terra / MODIS",
    layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
    resolution: "250 m-class regional imagery",
    cadence: "Daily polar-orbiting overpass"
  }
];

const DEFAULT_SENSOR = IMAGERY_SENSORS.at(-1);

const KNOWN_LOCATIONS = [
  {
    aliases: ["los angeles", "la county", "southern california"],
    name: "Los Angeles, California, USA",
    lat: 34.0522,
    lon: -118.2437
  },
  {
    aliases: ["san francisco", "bay area"],
    name: "San Francisco, California, USA",
    lat: 37.7749,
    lon: -122.4194
  },
  {
    aliases: ["new york", "new york city", "nyc"],
    name: "New York City, New York, USA",
    lat: 40.7128,
    lon: -74.006
  },
  {
    aliases: ["amazon rainforest", "amazon basin", "manaus"],
    name: "Manaus, Amazonas, Brazil",
    lat: -3.119,
    lon: -60.0217
  },
  {
    aliases: ["sahara", "sahara desert"],
    name: "Sahara Desert, Algeria",
    lat: 24.2155,
    lon: 12.8858
  },
  {
    aliases: ["greenland", "greenland ice sheet"],
    name: "Greenland Ice Sheet",
    lat: 72.0,
    lon: -40.0
  },
  {
    aliases: ["dubai"],
    name: "Dubai, United Arab Emirates",
    lat: 25.2048,
    lon: 55.2708
  },
  {
    aliases: ["tokyo"],
    name: "Tokyo, Japan",
    lat: 35.6762,
    lon: 139.6503
  },
  {
    aliases: ["hawaii", "big island"],
    name: "Hawai'i, USA",
    lat: 19.8968,
    lon: -155.5828
  },
  {
    aliases: ["yellowstone"],
    name: "Yellowstone National Park, USA",
    lat: 44.428,
    lon: -110.5885
  },
  {
    aliases: ["mount etna", "etna"],
    name: "Mount Etna, Sicily, Italy",
    lat: 37.751,
    lon: 14.9934
  },
  {
    aliases: ["jakarta"],
    name: "Jakarta, Indonesia",
    lat: -6.2088,
    lon: 106.8456
  }
];

function withTimeout(ms = 8000) {
  return AbortSignal.timeout(ms);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: options.signal ?? withTimeout()
  });

  if (!response.ok) {
    throw new Error(`Upstream request failed (${response.status})`);
  }

  return response.json();
}

export function findKnownLocation(value) {
  const normalized = value.toLowerCase();
  return KNOWN_LOCATIONS.find((location) =>
    location.aliases.some((alias) => normalized.includes(alias))
  );
}

export async function geocodeLocation(locationText, question = "") {
  const known = findKnownLocation(`${locationText} ${question}`);
  if (known) {
    return { name: known.name, lat: known.lat, lon: known.lon };
  }

  const query = locationText.trim();
  if (!query) {
    throw new Error("I could not identify a location in that question.");
  }

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1"
  });
  const data = await fetchJson(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "ParallaxCourseProject/1.0"
      }
    }
  );

  if (!data.length) {
    throw new Error(`No geographic match found for "${query}".`);
  }

  return {
    name: data[0].display_name,
    lat: Number(data[0].lat),
    lon: Number(data[0].lon)
  };
}

export async function getWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m",
    timezone: "auto"
  });
  const data = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?${params}`
  );

  return {
    observedAt: data.current?.time,
    temperature: data.current?.temperature_2m,
    temperatureUnit: data.current_units?.temperature_2m,
    humidity: data.current?.relative_humidity_2m,
    cloudCover: data.current?.cloud_cover,
    precipitation: data.current?.precipitation,
    precipitationUnit: data.current_units?.precipitation,
    windSpeed: data.current?.wind_speed_10m,
    windSpeedUnit: data.current_units?.wind_speed_10m,
    windDirection: data.current?.wind_direction_10m,
    weatherCode: data.current?.weather_code
  };
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

export function distanceKm(aLat, aLon, bLat, bLon) {
  const earthRadius = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function latestGeometry(event) {
  return event.geometry?.at(-1);
}

export async function getNaturalEvents(lat, lon, radiusKm) {
  const data = await fetchJson(
    "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=200"
  );

  return (data.events ?? [])
    .map((event) => {
      const geometry = latestGeometry(event);
      if (!geometry || geometry.type !== "Point") return null;
      const [eventLon, eventLat] = geometry.coordinates;
      return {
        id: event.id,
        title: event.title,
        category: event.categories?.[0]?.title ?? "Natural event",
        date: geometry.date,
        lat: eventLat,
        lon: eventLon,
        distanceKm: Math.round(distanceKm(lat, lon, eventLat, eventLon)),
        sourceUrl: event.sources?.[0]?.url ?? event.link
      };
    })
    .filter(Boolean)
    .filter((event) => event.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 8);
}

export async function getEarthquakes(lat, lon, radiusKm) {
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const params = new URLSearchParams({
    format: "geojson",
    latitude: String(lat),
    longitude: String(lon),
    maxradiuskm: String(Math.min(Math.max(radiusKm, 100), 1000)),
    starttime: start,
    minmagnitude: "2.5",
    orderby: "time",
    limit: "20"
  });
  const data = await fetchJson(
    `https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`
  );

  return (data.features ?? []).map((feature) => ({
    id: feature.id,
    title: feature.properties.place,
    magnitude: feature.properties.mag,
    observedAt: new Date(feature.properties.time).toISOString(),
    url: feature.properties.url,
    lon: feature.geometry.coordinates[0],
    lat: feature.geometry.coordinates[1],
    depthKm: feature.geometry.coordinates[2]
  }));
}

export function isoDateDaysAgo(daysAgo = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function sourceDateAgeDays(date) {
  const today = new Date(`${isoDateDaysAgo(0)}T00:00:00Z`);
  const sourceDate = new Date(`${date}T00:00:00Z`);
  return Math.max(
    0,
    Math.round((today.getTime() - sourceDate.getTime()) / 86_400_000)
  );
}

export function freshnessLabel(date) {
  const ageDays = sourceDateAgeDays(date);
  if (ageDays === 0) return "Today";
  if (ageDays === 1) return "1 day old";
  return `${ageDays} days old`;
}

export function imageryBounds(lat, lon, radiusKm) {
  const latDelta = Math.max(radiusKm / 111, 0.7);
  const longitudeScale = Math.max(Math.cos(toRad(lat)), 0.2);
  const lonDelta = Math.max(radiusKm / (111 * longitudeScale), 0.7);

  return {
    south: Math.max(lat - latDelta, -89.9),
    west: Math.max(lon - lonDelta, -179.9),
    north: Math.min(lat + latDelta, 89.9),
    east: Math.min(lon + lonDelta, 179.9)
  };
}

export function buildImageryUrls({
  lat,
  lon,
  radiusKm,
  date = isoDateDaysAgo(0),
  layer = DEFAULT_SENSOR.layer,
  width = 900,
  height = 720
}) {
  const bounds = imageryBounds(lat, lon, radiusKm);
  const params = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.1.1",
    LAYERS: layer,
    STYLES: "",
    FORMAT: "image/jpeg",
    TRANSPARENT: "FALSE",
    HEIGHT: String(height),
    WIDTH: String(width),
    SRS: "EPSG:4326",
    BBOX: [bounds.west, bounds.south, bounds.east, bounds.north].join(","),
    TIME: date
  });

  return {
    layer,
    date,
    bounds,
    sourceUrl: `${NASA_GIBS_WMS}?${params}`,
    tileUrl: `${NASA_GIBS_WMTS}/${layer}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
  };
}

export async function fetchImageryBuffer(imagery, timeoutMs = 12000) {
  const response = await fetch(imagery.sourceUrl, {
    signal: withTimeout(timeoutMs)
  });
  if (!response.ok) {
    throw new Error(`NASA imagery request failed (${response.status})`);
  }
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!contentType.startsWith("image/") || buffer.length < 1000) {
    throw new Error("NASA imagery response was not a usable image.");
  }
  return { buffer, contentType };
}

export async function scoreImageryBuffer(buffer) {
  const stats = await sharp(buffer).stats();
  const channels = stats.channels.slice(0, 3);
  const averageDeviation =
    channels.reduce((total, channel) => total + channel.stdev, 0) /
    Math.max(channels.length, 1);
  const averageMean =
    channels.reduce((total, channel) => total + channel.mean, 0) /
    Math.max(channels.length, 1);

  return {
    score: Number((averageDeviation + stats.entropy * 8).toFixed(2)),
    averageDeviation: Number(averageDeviation.toFixed(2)),
    averageMean: Number(averageMean.toFixed(2)),
    entropy: Number(stats.entropy.toFixed(3)),
    usable:
      buffer.length > 4000 &&
      averageDeviation > 3 &&
      averageMean > 2 &&
      stats.entropy > 0.2
  };
}

async function probeImagery({ sensor, date, lat, lon, radiusKm }) {
  const imagery = buildImageryUrls({
    lat,
    lon,
    radiusKm,
    date,
    layer: sensor.layer,
    width: 320,
    height: 256
  });
  const image = await fetchImageryBuffer(imagery, 9000);
  const quality = await scoreImageryBuffer(image.buffer);
  return { sensor, date, quality };
}

export async function selectFreshestImagery({
  lat,
  lon,
  radiusKm,
  lookbackDays = 3
}) {
  for (let daysAgo = 0; daysAgo <= lookbackDays; daysAgo += 1) {
    const date = isoDateDaysAgo(daysAgo);
    const probes = await Promise.allSettled(
      IMAGERY_SENSORS.map((sensor) =>
        probeImagery({ sensor, date, lat, lon, radiusKm })
      )
    );
    const usable = probes
      .filter((probe) => probe.status === "fulfilled")
      .map((probe) => probe.value)
      .filter((probe) => probe.quality.usable)
      .sort((a, b) => b.quality.score - a.quality.score);

    if (usable.length) {
      const selected = usable[0];
      return {
        ...buildImageryUrls({
          lat,
          lon,
          radiusKm,
          date: selected.date,
          layer: selected.sensor.layer
        }),
        ...selected.sensor,
        quality: selected.quality,
        sourceAgeDays: sourceDateAgeDays(selected.date),
        freshness: freshnessLabel(selected.date),
        selectedAt: new Date().toISOString(),
        selectionMethod: `Best usable image from ${usable.length} sensor${usable.length === 1 ? "" : "s"} on the freshest available date`
      };
    }
  }

  throw new Error(
    "No usable NASA true-color image was available in the current observation window."
  );
}

export function parseFirmsHotspots(csvText, lat, lon, radiusKm) {
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  return rows
    .map((row, index) => {
      const eventLat = Number(row.latitude);
      const eventLon = Number(row.longitude);
      if (!Number.isFinite(eventLat) || !Number.isFinite(eventLon)) return null;
      const acquisitionTime = String(row.acq_time ?? "").padStart(4, "0");
      const observedAt = row.acq_date
        ? `${row.acq_date}T${acquisitionTime.slice(0, 2)}:${acquisitionTime.slice(2)}:00Z`
        : null;
      return {
        id: `firms-${row.satellite || "sat"}-${row.acq_date || "date"}-${row.acq_time || "time"}-${index}`,
        title: "VIIRS active fire detection",
        category: "Active fire hotspot",
        date: observedAt,
        observedAt,
        lat: eventLat,
        lon: eventLon,
        distanceKm: Math.round(distanceKm(lat, lon, eventLat, eventLon)),
        source: "NASA FIRMS",
        satellite: row.satellite,
        instrument: row.instrument,
        confidence: row.confidence,
        fireRadiativePower: Number(row.frp) || null,
        sourceUrl: "https://firms.modaps.eosdis.nasa.gov/"
      };
    })
    .filter(Boolean)
    .filter((event) => event.distanceKm <= radiusKm)
    .sort(
      (a, b) =>
        new Date(b.observedAt || 0).getTime() -
        new Date(a.observedAt || 0).getTime()
    )
    .slice(0, 100);
}

export async function getFirmsHotspots(lat, lon, radiusKm) {
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) return null;

  const bounds = imageryBounds(lat, lon, radiusKm);
  const area = [bounds.west, bounds.south, bounds.east, bounds.north].join(",");
  const source = process.env.FIRMS_SOURCE || "VIIRS_NOAA21_NRT";
  const response = await fetch(
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/${source}/${area}/1`,
    { signal: withTimeout(12000) }
  );
  if (!response.ok) {
    throw new Error(`NASA FIRMS request failed (${response.status})`);
  }

  return parseFirmsHotspots(await response.text(), lat, lon, radiusKm);
}

export const PROVIDER_SOURCES = [
  {
    name: "NASA GIBS / Worldview",
    url: "https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs"
  },
  {
    name: "NASA FIRMS",
    url: "https://firms.modaps.eosdis.nasa.gov/api/area/"
  },
  {
    name: "NASA EONET",
    url: "https://eonet.gsfc.nasa.gov/docs/v3"
  },
  {
    name: "Open-Meteo",
    url: "https://open-meteo.com/en/docs"
  },
  {
    name: "USGS Earthquake Catalog",
    url: "https://earthquake.usgs.gov/fdsnws/event/1/"
  },
  {
    name: "OpenStreetMap Nominatim",
    url: "https://nominatim.org/release-docs/latest/api/Search/"
  }
];
