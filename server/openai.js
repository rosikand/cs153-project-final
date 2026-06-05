import OpenAI from "openai";

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function isAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function parseJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function planWithAI(question) {
  const client = getClient();
  if (!client) return null;

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    reasoning: { effort: "low" },
    input: [
      {
        role: "system",
        content:
          "You plan Earth-observation questions. Return only compact JSON with keys location, intent, radiusKm. intent must be one of wildfire, smoke, flood, storm, weather, vegetation, ice, volcano, earthquake, coastal, urban, general. location must be a geocodable place name. radiusKm must be between 25 and 1000."
      },
      { role: "user", content: question }
    ]
  });

  try {
    return parseJson(response.output_text);
  } catch {
    return null;
  }
}

export async function synthesizeWithAI({
  question,
  location,
  intent,
  weather,
  events,
  earthquakes,
  imagery,
  image
}) {
  const client = getClient();
  if (!client || !image) return null;

  const evidence = {
    question,
    location,
    intent,
    imageryDate: imagery.date,
    imageryLayer: imagery.layer,
    currentWeather: weather,
    nearbyOpenNaturalEvents: events,
    earthquakesLast7Days: earthquakes
  };

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    reasoning: { effort: "low" },
    input: [
      {
        role: "system",
        content:
          "You are Parallax, a cautious geospatial analyst. Analyze the supplied NASA satellite image together with the structured evidence. Never claim certainty beyond what the image resolution and cloud cover support. Distinguish observed facts from inference. Return only JSON with keys headline, summary, confidence, observations, caveats. confidence is an integer 0-100. observations and caveats are arrays of short strings. Mention image date when it affects freshness."
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              ...evidence,
              freshness: imagery.freshness,
              imagerySensor: imagery.label,
              imagerySelectionMethod: imagery.selectionMethod
            })
          },
          {
            type: "input_image",
            image_url: `data:${image.contentType};base64,${image.buffer.toString("base64")}`,
            detail: "high"
          }
        ]
      }
    ]
  });

  try {
    return parseJson(response.output_text);
  } catch {
    return {
      headline: `Satellite assessment for ${location.name}`,
      summary: response.output_text,
      confidence: 70,
      observations: [],
      caveats: [
        "The model returned a narrative response instead of the requested structured format."
      ]
    };
  }
}

export async function generateReportWithAI({
  query,
  image,
  reportImageUrl
}) {
  const client = getClient();
  if (!client || !image) return null;

  const evidence = {
    researchQuestion: query.question,
    location: query.location,
    intent: query.intent,
    imagery: {
      sensor: query.imagery.label,
      date: query.imagery.date,
      freshness: query.imagery.freshness,
      resolution: query.imagery.resolution,
      selectionMethod: query.imagery.selectionMethod
    },
    initialAssessment: query.answer,
    weather: query.evidence.weather,
    naturalEvents: query.evidence.events,
    earthquakes: query.evidence.earthquakes,
    sources: query.evidence.sources
  };

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content:
          "Write a polished deep-research-style geospatial report in GitHub-flavored Markdown. Ground every claim in the supplied image or structured evidence. Clearly separate image observations, external event evidence, and inference. Do not invent sources, measurements, or temporal change. Use these exact sections: Executive Summary, Key Findings, Satellite Observation, Environmental Context, Event Evidence, Analytical Method, Limitations, Conclusion, Sources. Include the supplied markdown image URL immediately after the metadata block. Use concise tables where useful. Target 900-1400 words. Return Markdown only."
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              ...evidence,
              requiredImageMarkdown: `![Satellite observation](${reportImageUrl})`
            })
          },
          {
            type: "input_image",
            image_url: `data:${image.contentType};base64,${image.buffer.toString("base64")}`,
            detail: "high"
          }
        ]
      }
    ]
  });

  const markdown = response.output_text?.trim();
  if (!markdown) return null;
  return markdown.replace(/^```markdown\s*/i, "").replace(/```$/, "").trim();
}
