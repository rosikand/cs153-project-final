import {
  AlertTriangle,
  ArrowRight,
  Beaker,
  BookOpen,
  BrainCircuit,
  Check,
  CircleDot,
  Code2,
  Database,
  FileCheck2,
  FlaskConical,
  Gauge,
  GitBranch,
  ImageIcon,
  Network,
  Scale,
  Server,
  ShieldCheck,
  TestTube2
} from "lucide-react";
import { Badge } from "./ui/badge.jsx";
import { Button } from "./ui/button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card.jsx";

function SectionLabel({ children }) {
  return (
    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

function SystemViewSwitch({ onOverview }) {
  return (
    <div className="system-view-switch" aria-label="System explanation level">
      <Button type="button" variant="ghost" size="sm" onClick={onOverview}>
        Product overview
      </Button>
      <Button type="button" variant="secondary" size="sm">
        Academic detail
      </Button>
    </div>
  );
}

export default function AcademicSystemPage({ onOverview, onStart }) {
  const tests = [
    ["Intent inference", "Wildfire questions map to the wildfire tool plan"],
    ["Location extraction", "Spatial language yields a geocodable target"],
    ["Geospatial distance", "Haversine calculations remain physically plausible"],
    ["Imagery bounds", "Requests stay geographically bounded"],
    ["Fallback integrity", "Non-AI mode never claims pixel inspection"],
    ["Event filtering", "Evidence is filtered to the selected intent"],
    ["Freshness labels", "Observation age is derived from the source date"],
    ["FIRMS parsing", "Hotspot records are normalized and radius-filtered"],
    ["Report normalization", "Generated artifacts retain stable metadata"]
  ];

  return (
    <section className="academic-page">
      <SystemViewSwitch onOverview={onOverview} />

      <div className="academic-hero">
        <div>
          <Badge variant="outline" className="gap-2 rounded-full px-3 py-1">
            <BookOpen className="size-3.5 text-primary" />
            Academic and technical version
          </Badge>
          <h1>
            Parallax as a
            <span>bounded multimodal agent system.</span>
          </h1>
          <p>
            This page documents the research framing, system contracts,
            inference-time agent loop, data provenance, evaluation evidence,
            reproducibility, and threats to validity behind the product demo.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={onStart}>
              Run an experiment
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={onOverview}>
              Product explanation
            </Button>
          </div>
        </div>

        <Card className="academic-classification gap-0 overflow-hidden py-0">
          {[
            ["Course track", "Application / Product + Automation / Agent Systems"],
            ["Agent type", "Bounded, tool-using, single-orchestrator workflow"],
            ["Model adaptation", "Prompted inference; no fine-tuning or new model training"],
            ["Current evidence", "Functional prototype, 9 unit tests, qualitative cases"]
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </Card>
      </div>

      <section className="academic-section academic-framing">
        <div className="academic-section-heading">
          <SectionLabel>Research framing</SectionLabel>
          <h2>The bottleneck is evidence assembly, not access to one more model.</h2>
        </div>
        <div className="academic-framing-grid">
          <AcademicConcept
            icon={Beaker}
            title="Research question"
            body="Can a bounded AI agent translate an unconstrained natural-language Earth question into a reproducible observation plan and a more inspectable answer than a model-only response?"
          />
          <AcademicConcept
            icon={Scale}
            title="Working hypothesis"
            body="Explicit tool contracts, dated imagery, independent evidence feeds, and visible caveats should reduce unsupported claims while preserving a conversational interface."
          />
          <AcademicConcept
            icon={FlaskConical}
            title="Prototype contribution"
            body="An end-to-end artifact combining planning, geocoding, image selection, parallel public-data acquisition, multimodal synthesis, provenance, persistence, and reporting."
          />
        </div>
      </section>

      <section className="academic-section">
        <div className="academic-section-heading">
          <SectionLabel>Formal pipeline</SectionLabel>
          <h2>The agent is a sequence of typed transformations.</h2>
          <p>
            The language model does not receive arbitrary system access. Each
            stage emits a bounded contract consumed by the next stage.
          </p>
        </div>

        <Card className="formal-pipeline gap-0 overflow-hidden py-0">
          <div className="formal-equation">
            <code>
              q → π(q) → (l, i, r) → g(l) → E(x, i, r, t) → f(q, E) → y
            </code>
          </div>
          <div className="formal-definitions">
            {[
              ["q", "Natural-language question"],
              ["π", "AI or local observation planner"],
              ["l, i, r", "Location text, intent, and radius"],
              ["g", "Geocoder returning WGS84 coordinates x"],
              ["E", "Dated imagery plus structured evidence"],
              ["f", "Multimodal synthesis function"],
              ["y", "Answer, confidence, caveats, sources, and trace"]
            ].map(([symbol, meaning]) => (
              <div key={symbol}>
                <code>{symbol}</code>
                <span>{meaning}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="academic-flow">
          {[
            {
              icon: BrainCircuit,
              stage: "Planner",
              contract:
                "{ locationText, intent ∈ 11 classes, radiusKm ∈ [25,1000] }",
              implementation:
                "OpenAI structured planning with deterministic keyword and location-extraction fallback."
            },
            {
              icon: Network,
              stage: "Geospatial normalization",
              contract: "{ canonicalName, latitude, longitude }",
              implementation:
                "Known-location cache followed by a single OpenStreetMap Nominatim search."
            },
            {
              icon: ImageIcon,
              stage: "Observation acquisition",
              contract:
                "{ sensor, date, bounds, tileUrl, quality, freshness }",
              implementation:
                "Five VIIRS/MODIS products probed by date; unusable image responses rejected."
            },
            {
              icon: Database,
              stage: "Evidence acquisition",
              contract: "{ weather, events[], earthquakes[], sources[] }",
              implementation:
                "Independent providers execute concurrently with isolated failure handling."
            },
            {
              icon: Server,
              stage: "Multimodal synthesis",
              contract:
                "{ headline, summary, confidence, observations[], caveats[] }",
              implementation:
                "Image plus JSON evidence sent to a vision-capable model; deterministic fallback remains available."
            },
            {
              icon: FileCheck2,
              stage: "Persistence",
              contract: "{ query snapshot, image, Markdown, PDF }",
              implementation:
                "Stable artifacts preserve evidence used at query time instead of silently updating later."
            }
          ].map(({ icon: StageIcon, stage, contract, implementation }, index) => (
            <div className="academic-flow-row" key={stage}>
              <div className="academic-flow-index">
                <span>0{index + 1}</span>
                <StageIcon />
              </div>
              <div>
                <h3>{stage}</h3>
                <code>{contract}</code>
                <p>{implementation}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="academic-section academic-algorithm-section">
        <div className="academic-section-heading">
          <SectionLabel>Image selection</SectionLabel>
          <h2>“Freshest” is constrained by whether the returned pixels are usable.</h2>
          <p>
            The selector prioritizes date first, then image quality across
            NOAA-21, NOAA-20, Suomi NPP, Aqua, and Terra.
          </p>
        </div>
        <div className="algorithm-grid">
          <Card className="algorithm-code gap-0 overflow-hidden py-0">
            <div className="algorithm-title">
              <CircleDot className="size-3.5 text-primary" />
              Selection procedure
            </div>
            <pre>{`for date in [today ... today - 3 days]:
  probes = parallel_probe(5 sensors, date)
  usable = probes.filter(pixel_quality_thresholds)

  if usable is not empty:
    return argmax(usable, quality_score)

raise NoUsableObservationError`}</pre>
          </Card>
          <div className="algorithm-notes">
            <Card className="gap-3 py-5 shadow-none">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">Quality score</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <code className="academic-inline-code">
                  mean RGB standard deviation + 8 × image entropy
                </code>
                <p>
                  Low-byte, near-uniform, very dark, or low-entropy responses
                  are rejected as likely blank or unusable imagery.
                </p>
              </CardContent>
            </Card>
            <Card className="gap-3 py-5 shadow-none">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">Important implication</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <p>
                  This validates that an image contains variation. It does not
                  fully solve semantic cloud screening, nighttime detection, or
                  task-specific sensor selection.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="academic-section">
        <div className="academic-section-heading">
          <SectionLabel>Models and data</SectionLabel>
          <h2>No model is trained here; intelligence is composed at inference time.</h2>
        </div>
        <div className="academic-table" role="table" aria-label="Models and data">
          <div className="academic-table-row academic-table-header" role="row">
            <span>Component</span>
            <span>Input</span>
            <span>Role</span>
            <span>Adaptation</span>
          </div>
          {[
            [
              "OpenAI planner",
              "User question",
              "Extract place, intent, radius",
              "System prompt + JSON contract"
            ],
            [
              "OpenAI vision analyst",
              "NASA image + evidence",
              "Grounded regional assessment",
              "Caution prompt + structured output"
            ],
            [
              "OpenAI research writer",
              "Saved image + query snapshot",
              "Long-form Markdown report",
              "Section schema + source constraints"
            ],
            [
              "Local deterministic logic",
              "Question + provider metadata",
              "Planning and synthesis fallback",
              "Rules, not learned parameters"
            ]
          ].map((row) => (
            <div className="academic-table-row" role="row" key={row[0]}>
              {row.map((cell) => (
                <span role="cell" key={cell}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
        <Card className="academic-disclosure gap-3 py-5 shadow-none">
          <CardHeader className="flex-row items-center gap-3 px-5">
            <GitBranch className="size-5 text-primary" />
            <CardTitle className="text-sm">Training-data boundary</CardTitle>
          </CardHeader>
          <CardContent className="px-5 text-sm leading-6 text-muted-foreground">
            Foundation-model pretraining data are controlled by the model
            provider and are not modified by this project. Parallax reduces
            reliance on recalled knowledge by supplying query-specific, dated
            evidence at inference time. This is retrieval and tool use, not
            fine-tuning.
          </CardContent>
        </Card>
      </section>

      <section className="academic-section">
        <div className="academic-section-heading">
          <SectionLabel>Evaluation evidence</SectionLabel>
          <h2>The current evaluation validates contracts, not scientific accuracy.</h2>
          <p>
            Nine automated tests currently pass. They protect important
            behaviors, but a larger benchmark and human review study remain
            future work.
          </p>
        </div>
        <div className="evaluation-layout">
          <Card className="evaluation-score gap-4 py-6 shadow-none">
            <CardHeader className="px-6">
              <TestTube2 className="size-6 text-primary" />
              <CardTitle className="text-5xl">9/9</CardTitle>
              <CardDescription>Current unit tests passing</CardDescription>
            </CardHeader>
            <CardContent className="px-6">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Check className="size-4 text-primary" />
                Production client build also passes
              </div>
            </CardContent>
          </Card>
          <div className="test-grid">
            {tests.map(([name, description]) => (
              <div key={name}>
                <Check className="size-3.5 text-primary" />
                <span>
                  <strong>{name}</strong>
                  {description}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="evaluation-next">
          <div>
            <Gauge />
            <span>
              <strong>Proposed benchmark</strong>
              Questions across wildfire, flood, storm, vegetation, snow/ice,
              seismic, urban, coastal, and general observation.
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <strong>Primary safety metric</strong>
              Unsupported visual-claim rate, supplemented by location accuracy,
              imagery availability, latency, provider failure rate, and human
              usefulness ratings.
            </span>
          </div>
        </div>
      </section>

      <section className="academic-section">
        <div className="academic-section-heading">
          <SectionLabel>Threats to validity</SectionLabel>
          <h2>A plausible interface does not make every conclusion scientifically valid.</h2>
        </div>
        <div className="threat-grid">
          {[
            [
              "Construct validity",
              "Displayed confidence is a model assessment, not a calibrated probability.",
              AlertTriangle
            ],
            [
              "Sensor validity",
              "Optical imagery may be obscured by clouds, darkness, smoke, or orbital gaps.",
              ImageIcon
            ],
            [
              "Temporal validity",
              "A single observation cannot establish change without a comparable baseline.",
              FlaskConical
            ],
            [
              "External validity",
              "Selected query results may not generalize to all locations, seasons, or hazards.",
              Network
            ],
            [
              "Source completeness",
              "Public event feeds provide context, not exhaustive emergency or regulatory records.",
              Database
            ],
            [
              "Human factors",
              "Fluent summaries can be over-trusted unless dates, caveats, and provenance stay prominent.",
              BrainCircuit
            ]
          ].map(([title, description, ThreatIcon]) => (
            <Card className="gap-3 py-5 shadow-none" key={title}>
              <CardHeader className="flex-row items-center gap-3 px-5">
                <ThreatIcon className="size-4.5 text-muted-foreground" />
                <CardTitle className="text-sm">{title}</CardTitle>
              </CardHeader>
              <CardContent className="px-5 text-sm leading-6 text-muted-foreground">
                {description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="academic-section academic-reproducibility">
        <div className="academic-section-heading">
          <SectionLabel>Reproducibility and disclosure</SectionLabel>
          <h2>The repository is the experiment record.</h2>
        </div>
        <div className="repro-grid">
          <Card className="gap-4 py-6 shadow-none">
            <CardHeader className="px-6">
              <Code2 className="size-5 text-primary" />
              <CardTitle className="mt-2 text-lg">Reproduce locally</CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              <pre>{`npm install
cp .env.example .env
npm run dev
npm test
npm run build`}</pre>
              <p>
                The application remains usable in evidence-fallback mode when
                no paid AI credential is configured.
              </p>
            </CardContent>
          </Card>
          <Card className="gap-4 py-6 shadow-none">
            <CardHeader className="px-6">
              <BrainCircuit className="size-5 text-primary" />
              <CardTitle className="mt-2 text-lg">AI-use disclosure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-6 text-sm leading-6 text-muted-foreground">
              <p>
                AI tools assisted product ideation, implementation, debugging,
                UI design, documentation, and presentation development.
              </p>
              <p>
                At runtime, OpenAI models perform bounded planning, image
                analysis, and optional report drafting. Public provider data
                and the exact model image remain visible to users.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="academic-sources">
        <div>
          <SectionLabel>Primary sources and acknowledgements</SectionLabel>
          <p>
            NASA GIBS / Worldview, NASA FIRMS, NASA EONET, Open-Meteo, USGS
            Earthquake Catalog, OpenStreetMap Nominatim, OpenAI Responses API,
            React, Express, Leaflet, Sharp, ReportLab, shadcn/ui, and Radix UI.
          </p>
        </div>
        <Button size="lg" onClick={onStart}>
          Inspect a live run
          <ArrowRight className="size-4" />
        </Button>
      </section>
    </section>
  );
}

function AcademicConcept({ icon: ConceptIcon, title, body }) {
  return (
    <Card className="gap-4 py-6 shadow-none">
      <CardHeader className="px-6">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ConceptIcon className="size-5" />
        </div>
        <CardTitle className="mt-3 text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-6 text-sm leading-7 text-muted-foreground">
        {body}
      </CardContent>
    </Card>
  );
}
