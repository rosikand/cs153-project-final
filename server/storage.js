import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, "../data");
export const REPORTS_DIR = path.join(DATA_DIR, "reports");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const EMPTY_STORE = {
  version: 1,
  queries: [],
  reports: []
};

let writeQueue = Promise.resolve();

async function ensureStore() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2));
  }
}

async function readStore() {
  await ensureStore();
  try {
    return JSON.parse(await fs.readFile(STORE_PATH, "utf8"));
  } catch {
    return structuredClone(EMPTY_STORE);
  }
}

function updateStore(mutator) {
  writeQueue = writeQueue.then(async () => {
    const store = await readStore();
    const next = await mutator(store);
    const temporaryPath = `${STORE_PATH}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(next, null, 2));
    await fs.rename(temporaryPath, STORE_PATH);
    return next;
  });
  return writeQueue;
}

function querySummary(query, reports) {
  return {
    id: query.id,
    question: query.question,
    createdAt: query.createdAt,
    location: query.location,
    intent: query.intent,
    imagery: {
      label: query.imagery.label,
      date: query.imagery.date,
      freshness: query.imagery.freshness,
      previewUrl: query.imagery.previewUrl
    },
    answer: {
      headline: query.answer.headline,
      confidence: query.answer.confidence
    },
    mode: query.mode,
    reportIds: reports
      .filter((report) => report.queryId === query.id)
      .map((report) => report.id)
  };
}

export async function saveQuery(query) {
  await updateStore((store) => ({
    ...store,
    queries: [
      query,
      ...store.queries.filter((item) => item.id !== query.id)
    ].slice(0, 100)
  }));
  return query;
}

export async function listQueries() {
  const store = await readStore();
  return store.queries.map((query) => querySummary(query, store.reports));
}

export async function getQuery(id) {
  const store = await readStore();
  return store.queries.find((query) => query.id === id) ?? null;
}

export async function saveReport(report) {
  await updateStore((store) => ({
    ...store,
    reports: [
      report,
      ...store.reports.filter((item) => item.id !== report.id)
    ].slice(0, 100)
  }));
  return report;
}

export async function listReports() {
  const store = await readStore();
  return store.reports.map(({ artifactDir: _artifactDir, ...report }) => report);
}

export async function getReport(id) {
  const store = await readStore();
  return store.reports.find((report) => report.id === id) ?? null;
}

export function reportArtifactPath(reportId, filename) {
  return path.join(REPORTS_DIR, reportId, filename);
}
