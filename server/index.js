import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runQuery } from "./engine.js";
import { buildImageryUrls, fetchImageryBuffer } from "./providers.js";
import { createResearchReport } from "./report.js";
import {
  getQuery,
  getReport,
  listQueries,
  listReports,
  reportArtifactPath,
  saveQuery
} from "./storage.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    aiEnabled: Boolean(process.env.OPENAI_API_KEY),
    firmsEnabled: Boolean(process.env.FIRMS_MAP_KEY),
    capabilities: {
      aiPlanner: Boolean(process.env.OPENAI_API_KEY),
      imageVision: Boolean(process.env.OPENAI_API_KEY),
      freshestImagerySelection: true,
      lowLatencyFireDetections: Boolean(process.env.FIRMS_MAP_KEY)
    },
    time: new Date().toISOString()
  });
});

app.post("/api/query", async (request, response) => {
  const question = request.body?.question?.trim();
  if (!question || question.length < 5) {
    return response.status(400).json({
      error: "Ask a complete question that includes a place."
    });
  }

  try {
    const result = await runQuery(question);
    await saveQuery(result);
    response.json(result);
  } catch (error) {
    console.error(error);
    response.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Parallax could not complete this observation."
    });
  }
});

app.get("/api/history", async (_request, response) => {
  response.json(await listQueries());
});

app.get("/api/history/:id", async (request, response) => {
  const query = await getQuery(request.params.id);
  if (!query) {
    return response.status(404).json({ error: "Saved query not found." });
  }
  response.json(query);
});

app.get("/api/reports", async (_request, response) => {
  response.json(await listReports());
});

app.get("/api/reports/:id", async (request, response) => {
  const report = await getReport(request.params.id);
  if (!report) {
    return response.status(404).json({ error: "Report not found." });
  }

  try {
    const markdown = await import("node:fs/promises").then(({ readFile }) =>
      readFile(reportArtifactPath(report.id, "report.md"), "utf8")
    );
    const { artifactDir: _artifactDir, ...metadata } = report;
    response.json({ ...metadata, markdown });
  } catch {
    response.status(500).json({ error: "Report artifact is unavailable." });
  }
});

app.post("/api/history/:id/report", async (request, response) => {
  const query = await getQuery(request.params.id);
  if (!query) {
    return response.status(404).json({ error: "Saved query not found." });
  }

  try {
    const report = await createResearchReport(query);
    response.status(201).json(report);
  } catch (error) {
    console.error(error);
    response.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "The research report could not be generated."
    });
  }
});

app.get("/api/reports/:id/imagery", async (request, response) => {
  const report = await getReport(request.params.id);
  if (!report) {
    return response.status(404).send("Report not found.");
  }
  response.sendFile(reportArtifactPath(report.id, "imagery.jpg"));
});

app.get("/api/reports/:id/download/:format", async (request, response) => {
  const report = await getReport(request.params.id);
  if (!report) {
    return response.status(404).send("Report not found.");
  }
  const formats = {
    markdown: {
      filename: "report.md",
      downloadName: `parallax-${report.id}.md`
    },
    pdf: {
      filename: "report.pdf",
      downloadName: `parallax-${report.id}.pdf`
    }
  };
  const format = formats[request.params.format];
  if (!format) {
    return response.status(400).send("Unsupported report format.");
  }
  response.download(
    reportArtifactPath(report.id, format.filename),
    format.downloadName
  );
});

app.get("/api/imagery", async (request, response) => {
  const lat = Number(request.query.lat);
  const lon = Number(request.query.lon);
  const radiusKm = Number(request.query.radiusKm || 120);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return response.status(400).send("Valid coordinates are required.");
  }

  try {
    const imagery = buildImageryUrls({
      lat,
      lon,
      radiusKm,
      date: request.query.date,
      layer: request.query.layer
    });
    const image = await fetchImageryBuffer(imagery);
    response.set({
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=3600"
    });
    response.send(image.buffer);
  } catch (error) {
    console.error(error);
    response.status(502).send("Satellite preview unavailable.");
  }
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("/{*splat}", (_request, response) => {
    response.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Parallax API listening on http://localhost:${port}`);
});
