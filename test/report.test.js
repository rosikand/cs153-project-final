import test from "node:test";
import assert from "node:assert/strict";
import { normalizeReportMarkdown } from "../server/report.js";

const query = {
  question: "Is there flooding near Jakarta?",
  location: { name: "Jakarta, Indonesia" },
  answer: {
    headline: "Flood assessment near Jakarta",
    confidence: 64
  },
  evidence: {
    sources: [{ name: "NASA GIBS", url: "https://example.com/gibs" }]
  }
};

test("normalizes AI report front matter into a stable report header", () => {
  const markdown = `---
researchQuestion: "Is there flooding near Jakarta?"
---

## Executive Summary

Evidence is limited.

## Sources

- NASA GIBS
`;
  const normalized = normalizeReportMarkdown(markdown, query, "report-1");
  assert.match(normalized, /^# Flood assessment near Jakarta/);
  assert.match(
    normalized,
    /!\[Satellite observation\]\(\/api\/reports\/report-1\/imagery\)/
  );
  assert.doesNotMatch(normalized, /researchQuestion:/);
  assert.match(normalized, /## Executive Summary/);
});
