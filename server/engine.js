import {
  PROVIDER_SOURCES,
  fetchImageryBuffer,
  geocodeLocation,
  getEarthquakes,
  getFirmsHotspots,
  getNaturalEvents,
  getWeather,
  selectFreshestImagery
} from "./providers.js";
import {
  isAIConfigured,
  planWithAI,
  synthesizeWithAI
} from "./openai.js";

const INTENTS = {
  wildfire: {
    label: "Wildfire & burn activity",
    keywords: ["fire", "wildfire", "burn", "burning", "hotspot"],
    radiusKm: 250
  },
  smoke: {
    label: "Smoke & atmospheric haze",
    keywords: ["smoke", "haze", "air quality", "plume"],
    radiusKm: 350
  },
  flood: {
    label: "Flood & surface water",
    keywords: ["flood", "flooding", "inundation", "river overflow"],
    radiusKm: 150
  },
  storm: {
    label: "Storm systems",
    keywords: ["storm", "hurricane", "cyclone", "typhoon", "tornado"],
    radiusKm: 500
  },
  vegetation: {
    label: "Vegetation condition",
    keywords: ["vegetation", "forest", "deforestation", "crop", "drought"],
    radiusKm: 200
  },
  ice: {
    label: "Snow & ice cover",
    keywords: ["ice", "snow", "glacier", "iceberg", "melt"],
    radiusKm: 400
  },
  volcano: {
    label: "Volcanic activity",
    keywords: ["volcano", "eruption", "lava", "ash"],
    radiusKm: 150
  },
  earthquake: {
    label: "Seismic activity",
    keywords: ["earthquake", "quake", "seismic", "tremor"],
    radiusKm: 300
  },
  coastal: {
    label: "Coastal change",
    keywords: ["coast", "shoreline", "erosion", "algae", "algal"],
    radiusKm: 100
  },
  urban: {
    label: "Urban footprint",
    keywords: ["city", "urban", "construction", "development"],
    radiusKm: 75
  },
  weather: {
    label: "Current weather context",
    keywords: ["weather", "cloud", "rain", "temperature", "wind"],
    radiusKm: 100
  },
  general: {
    label: "General Earth observation",
    keywords: [],
    radiusKm: 120
  }
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function inferIntent(question) {
  const normalized = question.toLowerCase();
  for (const [key, config] of Object.entries(INTENTS)) {
    if (config.keywords.some((keyword) => normalized.includes(keyword))) {
      return { key, ...config };
    }
  }
  return { key: "general", ...INTENTS.general };
}

export function extractLocationText(question) {
  const patterns = [
    /\b(?:near|around|over|outside|within|at|in)\s+(.+?)(?:\?|$|\b(?:right now|today|currently|this week|from space)\b)/i,
    /\b(?:of|for)\s+(.+?)(?:\?|$|\b(?:right now|today|currently|this week|from space)\b)/i
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match?.[1]) {
      return match[1]
        .replace(
          /\b(any|some|active|recent|visible|satellite|imagery|image|signs?)\b/gi,
          ""
        )
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[.,]+$/, "");
    }
  }

  return question
    .replace(
      /\b(is|are|there|show|me|what|can|you|see|find|detect|check|look|satellite|imagery|image|current|recent|active|today|right now|from space|weather|wildfire|fire|smoke|flooding|flood|storm|earthquake|vegetation|ice|snow|clouds?)\b/gi,
      " "
    )
    .replace(/[?.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function createPlan(question) {
  const aiPlan = await planWithAI(question).catch(() => null);
  const inferred = inferIntent(question);
  const selectedIntent =
    aiPlan?.intent && INTENTS[aiPlan.intent] ? aiPlan.intent : inferred.key;
  const intent = { key: selectedIntent, ...INTENTS[selectedIntent] };

  return {
    locationText: aiPlan?.location || extractLocationText(question),
    intent,
    radiusKm: clamp(
      Number(aiPlan?.radiusKm) || intent.radiusKm,
      25,
      1000
    ),
    plannedBy: aiPlan ? "OpenAI planner" : "local planner"
  };
}

function weatherSentence(weather) {
  if (!weather) return "Live weather context was unavailable.";
  return `${weather.temperature}${weather.temperatureUnit}, ${weather.cloudCover}% cloud cover, wind ${weather.windSpeed} ${weather.windSpeedUnit}.`;
}

function timestampAgeLabel(timestamp) {
  if (!timestamp) return null;
  const ageMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(timestamp).getTime()) / 60_000)
  );
  if (ageMinutes < 60) return `${ageMinutes} minutes old`;
  const ageHours = Math.round(ageMinutes / 60);
  if (ageHours < 48) return `${ageHours} hours old`;
  return `${Math.round(ageHours / 24)} days old`;
}

async function gatherEventEvidence(lat, lon, radiusKm, intentKey) {
  if (
    ["wildfire", "smoke"].includes(intentKey) &&
    process.env.FIRMS_MAP_KEY
  ) {
    try {
      const events = await getFirmsHotspots(lat, lon, radiusKm);
      return { events: events ?? [], provider: "NASA FIRMS hotspots" };
    } catch {
      // Fall through to EONET so a FIRMS outage does not collapse the query.
    }
  }

  return {
    events: await getNaturalEvents(lat, lon, radiusKm),
    provider: "NASA EONET"
  };
}

export function createFallbackAnswer({
  location,
  intent,
  weather,
  events,
  earthquakes,
  imagery,
  aiConfigured = false
}) {
  const observations = [weatherSentence(weather)];
  if (events.length) {
    const eventAge = timestampAgeLabel(events[0].observedAt || events[0].date);
    observations.push(
      `${events.length} NASA-tracked signal${events.length === 1 ? "" : "s"} found within the search area; the nearest is ${events[0].title} (${events[0].distanceKm} km away)${eventAge ? `, observed ${eventAge}` : ""}.`
    );
  } else {
    observations.push(
      "No corroborating NASA event or hotspot signal was found within the selected search area."
    );
  }
  if (intent.key === "earthquake") {
    observations.push(
      earthquakes.length
        ? `${earthquakes.length} USGS earthquake${earthquakes.length === 1 ? "" : "s"} of magnitude 2.5+ were reported in the last seven days.`
        : "USGS reported no magnitude 2.5+ earthquakes in the selected radius during the last seven days."
    );
  }

  const cloudWarning =
    weather?.cloudCover > 65
      ? "Cloud cover is high, so optical imagery may conceal surface conditions."
      : "Optical visibility is reasonably favorable, although local cloud patches may remain.";

  return {
    headline: `${intent.label} near ${location.name.split(",")[0]}`,
    summary: `Parallax selected the freshest usable NASA image it found: ${imagery.label ?? imagery.layer ?? "true-color imagery"}, source date ${imagery.date} (${(imagery.freshness ?? "freshness unavailable").toLowerCase()}). ${events.length ? "There is corroborating event activity in the region." : "No corroborating event signal was found nearby."} ${cloudWarning}`,
    confidence: weather?.cloudCover > 65 ? 58 : 72,
    observations,
    caveats: [
      aiConfigured
        ? "AI analysis did not complete, so this result falls back to sensor metadata and live feeds without interpreting image pixels."
        : "AI is not configured, so this result summarizes sensor metadata and live feeds without interpreting image pixels.",
      "Polar-orbiting true-color imagery is near-real-time, not continuous video, and supports regional rather than street-level claims."
    ]
  };
}

export function filterEventsForIntent(events, intentKey) {
  const categoryByIntent = {
    wildfire: ["wildfire"],
    smoke: ["wildfire"],
    flood: ["flood"],
    storm: ["storm"],
    volcano: ["volcano"],
    earthquake: ["earthquake"],
    ice: ["ice"]
  };
  const matches = categoryByIntent[intentKey];
  if (!matches) return events;
  return events.filter((event) =>
    matches.some((match) => event.category.toLowerCase().includes(match))
  );
}

function traceStep(id, label, detail, startedAt, extra = {}) {
  return {
    id,
    label,
    detail,
    status: "complete",
    durationMs: Date.now() - startedAt,
    ...extra
  };
}

export async function runQuery(question) {
  const trace = [];

  let startedAt = Date.now();
  const plan = await createPlan(question);
  trace.push(
    traceStep(
      "plan",
      "Plan observation",
      `${plan.plannedBy} selected ${plan.intent.label.toLowerCase()} within ${plan.radiusKm} km.`,
      startedAt
    )
  );

  startedAt = Date.now();
  const location = await geocodeLocation(plan.locationText, question);
  trace.push(
    traceStep(
      "locate",
      "Resolve target",
      `${location.name} at ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}.`,
      startedAt
    )
  );

  startedAt = Date.now();
  const eventPromise = gatherEventEvidence(
    location.lat,
    location.lon,
    plan.radiusKm,
    plan.intent.key
  );
  const [imageryResult, weatherResult, eventResult, earthquakeResult] =
    await Promise.allSettled([
      selectFreshestImagery({
        lat: location.lat,
        lon: location.lon,
        radiusKm: plan.radiusKm
      }),
      getWeather(location.lat, location.lon),
      eventPromise,
      plan.intent.key === "earthquake"
        ? getEarthquakes(location.lat, location.lon, plan.radiusKm)
        : Promise.resolve([])
    ]);

  if (imageryResult.status !== "fulfilled") {
    throw imageryResult.reason;
  }
  const imagery = imageryResult.value;
  const weather =
    weatherResult.status === "fulfilled" ? weatherResult.value : null;
  const eventEvidence =
    eventResult.status === "fulfilled"
      ? eventResult.value
      : { events: [], provider: "Event feed unavailable" };
  const events = filterEventsForIntent(
    eventEvidence.events,
    plan.intent.key
  );
  const earthquakes =
    earthquakeResult.status === "fulfilled" ? earthquakeResult.value : [];
  const image = await fetchImageryBuffer(imagery).catch(() => null);
  const previewUrl = `/api/imagery?${new URLSearchParams({
    lat: String(location.lat),
    lon: String(location.lon),
    radiusKm: String(plan.radiusKm),
    date: imagery.date,
    layer: imagery.layer
  })}`;
  trace.push(
    traceStep(
      "gather",
      "Gather evidence",
      `${imagery.label} (${imagery.freshness.toLowerCase()}) + ${[
        weather && "current weather",
        eventEvidence.provider,
        plan.intent.key === "earthquake" && "seismic feed"
      ]
        .filter(Boolean)
        .join(", ")}.`,
      startedAt,
      {
        artifact: {
          type: "satellite-image",
          url: previewUrl,
          label: imagery.label,
          date: imagery.date,
          freshness: imagery.freshness
        }
      }
    )
  );

  startedAt = Date.now();
  const aiAnswer = await synthesizeWithAI({
    question,
    location,
    intent: plan.intent,
    weather,
    events,
    earthquakes,
    imagery,
    image
  }).catch(() => null);
  const answer =
    aiAnswer ||
    createFallbackAnswer({
      location,
      intent: plan.intent,
      weather,
      events,
      earthquakes,
      imagery,
      aiConfigured: isAIConfigured()
    });
  trace.push(
    traceStep(
      "synthesize",
      "Synthesize assessment",
      aiAnswer
        ? "OpenAI vision grounded the response in the satellite snapshot and live feeds."
        : "Deterministic fallback summarized the acquired evidence; AI image analysis was not configured.",
      startedAt
    )
  );

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    mode: aiAnswer ? "AI agent + vision" : "Evidence fallback",
    agent: {
      aiConfigured: isAIConfigured(),
      planner: plan.plannedBy,
      analyst: aiAnswer ? "OpenAI multimodal analyst" : "Deterministic evidence summary",
      model: isAIConfigured()
        ? process.env.OPENAI_MODEL || "gpt-5.4-mini"
        : null
    },
    question,
    location,
    intent: {
      key: plan.intent.key,
      label: plan.intent.label,
      radiusKm: plan.radiusKm
    },
    imagery: {
      ...imagery,
      previewUrl,
      observationDate: imagery.date
    },
    answer,
    evidence: {
      weather,
      events,
      earthquakes: plan.intent.key === "earthquake" ? earthquakes : [],
      sources: PROVIDER_SOURCES
    },
    trace
  };
}
