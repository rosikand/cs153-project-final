import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { generateReportWithAI } from "./openai.js";
import { fetchImageryBuffer } from "./providers.js";
import {
  REPORTS_DIR,
  reportArtifactPath,
  saveReport
} from "./storage.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_SCRIPT = path.join(__dirname, "render_report.py");
const PYTHON =
  process.env.REPORT_PYTHON ||
  "/Users/vandnamd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";

function escapeMarkdown(value) {
  return String(value ?? "").replace(/([\\`*_{}[\]()#+.!|>])/g, "\\$1");
}

function sourceList(query) {
  return query.evidence.sources
    .map((source) => `- [${source.name}](${source.url})`)
    .join("\n");
}

function generatedLabel() {
  return `${new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date())} UTC`;
}

function eventTable(events) {
  if (!events.length) return "No matching event records were returned.";
  return [
    "| Signal | Category | Distance | Observation time |",
    "| --- | --- | ---: | --- |",
    ...events.slice(0, 10).map(
      (event) =>
        `| ${escapeMarkdown(event.title)} | ${escapeMarkdown(event.category)} | ${event.distanceKm} km | ${event.observedAt || event.date || "Unavailable"} |`
    )
  ].join("\n");
}

function fallbackReport(query, reportId) {
  const weather = query.evidence.weather;
  const observations = query.answer.observations
    .map((observation) => `- ${observation}`)
    .join("\n");
  const caveats = query.answer.caveats
    .map((caveat) => `- ${caveat}`)
    .join("\n");

  return `# ${query.answer.headline}

**Research question:** ${query.question}  

**Target:** ${query.location.name}  

**Generated:** ${generatedLabel()}  

**Evidence confidence:** ${query.answer.confidence}%  

![Satellite observation](/api/reports/${reportId}/imagery)

## Executive Summary

${query.answer.summary}

## Key Findings

${observations}

## Satellite Observation

Parallax selected **${query.imagery.label}** imagery from **${query.imagery.date}**. The scene was **${query.imagery.freshness.toLowerCase()}** when the investigation ran. The search covered a ${query.intent.radiusKm} km radius around ${query.location.name}.

## Environmental Context

- Temperature: ${weather?.temperature ?? "Unavailable"}${weather?.temperatureUnit ?? ""}
- Cloud cover: ${weather?.cloudCover ?? "Unavailable"}%
- Humidity: ${weather?.humidity ?? "Unavailable"}%
- Wind: ${weather?.windSpeed ?? "Unavailable"} ${weather?.windSpeedUnit ?? ""}
- Weather observation: ${weather?.observedAt ?? "Unavailable"}

## Event Evidence

${eventTable(query.evidence.events)}

## Analytical Method

The agent parsed the geographic question, resolved coordinates, searched multiple NASA VIIRS and MODIS layers for the freshest usable scene, gathered live environmental feeds, and assessed the image together with structured evidence. The saved image in this report is the exact scene used during analysis.

## Limitations

${caveats}

## Conclusion

The available evidence supports the assessment above at ${query.answer.confidence}% system-reported confidence. This score describes the strength of the available evidence and is not a calibrated probability. A new investigation should be run when newer imagery or event records become available.

## Sources

${sourceList(query)}
`;
}

export function normalizeReportMarkdown(markdown, query, reportId) {
  let body = markdown
    .trim()
    .replace(/^```markdown\s*/i, "")
    .replace(/```$/, "")
    .trim();

  if (body.startsWith("---")) {
    body = body.replace(/^---[\s\S]*?---\s*/, "");
  }

  const executiveSummaryIndex = body.search(/^## Executive Summary/im);
  if (executiveSummaryIndex >= 0) {
    body = body.slice(executiveSummaryIndex);
  }
  body = body.replace(/\n## Sources[\s\S]*$/i, "").trim();

  return `# ${query.answer.headline}

**Research question:** ${query.question}  

**Target:** ${query.location.name}  

**Generated:** ${generatedLabel()}  

**Evidence confidence:** ${query.answer.confidence}%  

![Satellite observation](/api/reports/${reportId}/imagery)

${body}

## Sources

${sourceList(query)}
`;
}

export async function createResearchReport(query) {
  const reportId = crypto.randomUUID();
  const artifactDir = path.join(REPORTS_DIR, reportId);
  await fs.mkdir(artifactDir, { recursive: true });

  const image = await fetchImageryBuffer(query.imagery);
  const imagePath = reportArtifactPath(reportId, "imagery.jpg");
  await fs.writeFile(imagePath, image.buffer);

  const reportQuery = {
    ...query,
    evidence: {
      ...query.evidence,
      events: query.evidence.events.filter(
        (event) => event.distanceKm <= query.intent.radiusKm
      )
    }
  };
  const aiMarkdown = await generateReportWithAI({
    query: reportQuery,
    image,
    reportImageUrl: `/api/reports/${reportId}/imagery`
  }).catch(() => null);
  const markdown = aiMarkdown
    ? normalizeReportMarkdown(aiMarkdown, reportQuery, reportId)
    : fallbackReport(reportQuery, reportId);
  const markdownPath = reportArtifactPath(reportId, "report.md");
  const pdfPath = reportArtifactPath(reportId, "report.pdf");
  await fs.writeFile(markdownPath, markdown);

  await execFileAsync(PYTHON, [
    PDF_SCRIPT,
    "--markdown",
    markdownPath,
    "--image",
    imagePath,
    "--output",
    pdfPath,
    "--title",
    query.answer.headline
  ]);

  const report = {
    id: reportId,
    queryId: query.id,
    title: query.answer.headline,
    question: query.question,
    location: query.location.name,
    createdAt: new Date().toISOString(),
    summary: query.answer.summary,
    confidence: query.answer.confidence,
    imagery: {
      label: query.imagery.label,
      date: query.imagery.date,
      freshness: query.imagery.freshness,
      imageUrl: `/api/reports/${reportId}/imagery`
    },
    markdownUrl: `/api/reports/${reportId}/download/markdown`,
    pdfUrl: `/api/reports/${reportId}/download/pdf`,
    artifactDir
  };

  await saveReport(report);
  return { ...report, markdown };
}
