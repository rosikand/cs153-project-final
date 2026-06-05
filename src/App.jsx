import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  BookOpenText,
  Check,
  Clock3,
  Cloud,
  Code2,
  Database,
  Download,
  ExternalLink,
  FileText,
  FileOutput,
  Globe2,
  History,
  ImageIcon,
  Layers3,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Network,
  Orbit,
  Radar,
  Satellite,
  Search,
  Server,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SatelliteMap from "./components/SatelliteMap.jsx";
import { ThemeToggle } from "./components/theme-toggle.jsx";
import UseCasesSection from "./components/UseCasesSection.jsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "./components/ui/accordion.jsx";
import { Badge } from "./components/ui/badge.jsx";
import { Button } from "./components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "./components/ui/card.jsx";
import { Progress } from "./components/ui/progress.jsx";
import { Separator } from "./components/ui/separator.jsx";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs.jsx";
import { Textarea } from "./components/ui/textarea.jsx";

const AcademicSystemPage = lazy(
  () => import("./components/AcademicSystemPage.jsx")
);

const EXAMPLES = [
  {
    label: "Wildfires",
    place: "Los Angeles",
    query: "Are there active wildfires near Los Angeles?"
  },
  {
    label: "Flooding",
    place: "Jakarta",
    query: "What does the flooding situation near Jakarta look like?"
  },
  {
    label: "Earthquakes",
    place: "Tokyo",
    query: "Has there been recent earthquake activity around Tokyo?"
  },
  {
    label: "Cloud cover",
    place: "Amazon",
    query: "How cloudy is the Amazon rainforest today?"
  }
];

const LOADING_STEPS = [
  "Understand the question",
  "Resolve the location",
  "Select the freshest satellite image",
  "Gather live environmental evidence",
  "Analyze and explain"
];

function formatDate(value) {
  if (!value) return "Unknown date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function SectionLabel({ children }) {
  return (
    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

function Trace({ trace, loading, activeStep }) {
  const items = loading
    ? LOADING_STEPS.map((label, index) => ({
        id: label,
        label,
        status:
          index < activeStep
            ? "complete"
            : index === activeStep
              ? "active"
              : "pending"
      }))
    : trace;

  if (!items?.length) return null;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <Radar className="size-4 text-primary" />
          <span className="text-sm font-semibold">Agent run</span>
        </div>
        <Badge variant={loading ? "secondary" : "outline"}>
          {loading ? "In progress" : "Complete"}
        </Badge>
      </div>
      <div className="divide-y">
        {items.map((step, index) => {
          const isComplete = step.status === "complete" || !step.status;
          const isActive = step.status === "active";

          return (
            <div className="flex gap-3 px-5 py-4" key={step.id}>
              <div
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold ${
                  isComplete
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                }`}
              >
                {isComplete ? (
                  <Check className="size-3.5" />
                ) : isActive ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm font-medium">{step.label}</strong>
                  {step.durationMs != null && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {step.durationMs} ms
                    </span>
                  )}
                </div>
                {step.detail && (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {step.detail}
                  </p>
                )}
                {step.artifact?.type === "satellite-image" && (
                  <figure className="trace-artifact">
                    <img
                      src={step.artifact.url}
                      alt={`Satellite imagery passed to the model from ${step.artifact.label}`}
                    />
                    <figcaption>
                      <Satellite className="size-3.5" />
                      <span>
                        Passed to the model · {step.artifact.label} ·{" "}
                        {step.artifact.date}
                      </span>
                    </figcaption>
                  </figure>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function LandingPage({ onStart, onReports, onHowItWorks }) {
  const features = [
    {
      icon: Search,
      title: "Ask naturally",
      body: "Describe a place and the condition you want to investigate."
    },
    {
      icon: Satellite,
      title: "Acquire evidence",
      body: "The agent selects imagery, weather, hazards, and event data."
    },
    {
      icon: Sparkles,
      title: "Explain clearly",
      body: "Inspect the answer, exact imagery, reasoning steps, and sources."
    },
    {
      icon: FileText,
      title: "Research deeper",
      body: "Generate a saved investigation in Markdown and PDF."
    }
  ];

  return (
    <section className="landing-page">
      <div className="landing-grid" aria-hidden="true" />
      <div className="landing-hero">
        <div className="landing-copy">
          <Badge variant="outline" className="gap-2 rounded-full px-3 py-1">
            <span className="size-1.5 rounded-full bg-primary" />
            Agentic Earth intelligence
          </Badge>
          <h1>
            Ask Earth.
            <span>See the evidence.</span>
          </h1>
          <p>
            Parallax finds the freshest usable NASA satellite imagery,
            combines it with live environmental signals, and uses an AI agent
            to explain what the evidence supports.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={onStart}>
              Start exploring
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={onReports}>
              <BookOpenText className="size-4" />
              Browse reports
            </Button>
            <Button size="lg" variant="ghost" onClick={onHowItWorks}>
              <Network className="size-4" />
              How it works
            </Button>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-primary" />
              Freshest available imagery
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-primary" />
              Inspectable agent run
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-primary" />
              Saved research artifacts
            </span>
          </div>
        </div>

        <div className="landing-visual">
          <div className="visual-toolbar">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              <span>Observation workspace</span>
            </div>
            <span>Near real time</span>
          </div>
          <div className="earth-stage">
            <div className="earth-glow" />
            <div className="earth-sphere">
              <span className="scan-line" />
            </div>
            <span className="target target-one" />
            <span className="target target-two" />
            <span className="target target-three" />
          </div>
          <div className="visual-agent">
            <div>
              <Satellite className="size-4 text-primary" />
              <span>
                <strong>Imagery selected</strong>
                NASA VIIRS · today
              </span>
            </div>
            <div>
              <Database className="size-4 text-primary" />
              <span>
                <strong>Evidence joined</strong>
                Weather · events · hazards
              </span>
            </div>
            <div>
              <Sparkles className="size-4 text-primary" />
              <span>
                <strong>Answer grounded</strong>
                Sources and caveats included
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="how-it-works">
        {features.map(({ icon: FeatureIcon, title, body }, index) => (
          <Card key={title} className="gap-4 bg-card/70 py-5 shadow-none">
            <CardHeader className="flex-row items-center justify-between px-5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FeatureIcon className="size-4" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                0{index + 1}
              </span>
            </CardHeader>
            <CardContent className="px-5">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <UseCasesSection />

      <Card className="landing-note flex-row items-start gap-4 py-5 shadow-none">
        <div className="ml-5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Orbit className="size-4" />
        </div>
        <CardContent className="px-0 pr-5">
          <h2 className="text-sm font-semibold">
            Near-real-time, not live video
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Parallax checks the current day first across NASA VIIRS and MODIS
            sensors. Revisit times, clouds, and processing delays determine the
            newest usable observation.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

function HowItWorksPage({ onStart, onAcademic }) {
  const pipeline = [
    {
      icon: BrainCircuit,
      title: "Plan the observation",
      body: "The agent interprets the question, identifies the environmental intent, and chooses a search radius and evidence strategy."
    },
    {
      icon: MapPin,
      title: "Resolve the target",
      body: "OpenStreetMap Nominatim converts the place name into coordinates and a normalized location the rest of the tools can use."
    },
    {
      icon: Satellite,
      title: "Select fresh imagery",
      body: "Parallax checks NASA VIIRS and MODIS products from the current day backward until it finds the freshest usable scene."
    },
    {
      icon: Database,
      title: "Gather live context",
      body: "Weather, natural events, earthquakes, and available fire hotspots are fetched in parallel for the selected area."
    },
    {
      icon: ImageIcon,
      title: "Analyze the evidence",
      body: "The exact satellite image shown in the agent trace is passed to the vision model together with structured environmental data."
    },
    {
      icon: FileOutput,
      title: "Explain and preserve",
      body: "The grounded answer, confidence, caveats, sources, and agent trace are saved. A deeper Markdown and PDF report can follow."
    }
  ];

  const sources = [
    {
      name: "NASA GIBS",
      purpose: "Dated VIIRS and MODIS satellite imagery",
      cadence: "Current day checked first",
      icon: Satellite
    },
    {
      name: "Open-Meteo",
      purpose: "Current weather and cloud conditions",
      cadence: "Latest available conditions",
      icon: Cloud
    },
    {
      name: "NASA EONET + FIRMS",
      purpose: "Natural events and fire hotspot context",
      cadence: "Latest provider updates",
      icon: Radar
    },
    {
      name: "USGS",
      purpose: "Recent earthquake observations",
      cadence: "Latest catalog events",
      icon: Globe2
    }
  ];

  return (
    <section className="system-page">
      <div className="system-view-switch" aria-label="System explanation level">
        <Button type="button" variant="secondary" size="sm">
          Product overview
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onAcademic}>
          Academic detail
        </Button>
      </div>
      <div className="system-hero">
        <div>
          <Badge variant="outline" className="gap-2 rounded-full px-3 py-1">
            <Network className="size-3.5 text-primary" />
            System walkthrough
          </Badge>
          <h1>
            How Parallax
            <span>turns a question into evidence.</span>
          </h1>
          <p>
            Parallax is not a chatbot sitting on a static knowledge base. It
            plans an observation, calls geospatial tools, acquires dated
            imagery and live data, asks a vision model to analyze the evidence,
            and preserves the complete investigation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={onStart}>
              Run the system
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={onAcademic}>
              <BookOpenText className="size-4" />
              Academic version
            </Button>
          </div>
        </div>

        <Card className="system-summary-card gap-0 overflow-hidden py-0">
          <div className="border-b bg-muted/40 px-5 py-4">
            <SectionLabel>One query produces</SectionLabel>
          </div>
          <div className="grid grid-cols-2">
            {[
              ["01", "Observation plan"],
              ["02", "Dated satellite scene"],
              ["03", "Grounded AI answer"],
              ["04", "Auditable research record"]
            ].map(([number, label]) => (
              <div className="system-output" key={number}>
                <strong>{number}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="border-t px-5 py-4 text-xs leading-5 text-muted-foreground">
            Every result exposes its image date, sensor, confidence, sources,
            caveats, and the exact image sent to the model.
          </div>
        </Card>
      </div>

      <div className="system-section">
        <div className="system-section-heading">
          <SectionLabel>The agent loop</SectionLabel>
          <h2>Six stages, visible end to end</h2>
          <p>
            The interface mirrors these stages while a query runs, then keeps
            the completed trace attached to the saved investigation.
          </p>
        </div>
        <div className="pipeline-grid">
          {pipeline.map(({ icon: StepIcon, title, body }, index) => (
            <Card className="pipeline-card gap-4 py-5 shadow-none" key={title}>
              <CardHeader className="flex-row items-center justify-between px-5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <StepIcon className="size-4.5" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  0{index + 1}
                </span>
              </CardHeader>
              <CardContent className="px-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="system-section">
        <div className="system-section-heading">
          <SectionLabel>Architecture</SectionLabel>
          <h2>A small product with a real orchestration layer</h2>
          <p>
            The browser never talks directly to model or data providers. The
            Express API owns planning, tool calls, normalization, persistence,
            and failure handling.
          </p>
        </div>

        <Card className="architecture-card gap-0 overflow-hidden py-0">
          <div className="architecture-mainline">
            <div className="architecture-node">
              <Code2 />
              <span>
                <strong>React client</strong>
                Query, map, trace, history
              </span>
            </div>
            <ArrowRight className="architecture-arrow" />
            <div className="architecture-node architecture-node-primary">
              <Server />
              <span>
                <strong>Express agent API</strong>
                Plan, orchestrate, normalize
              </span>
            </div>
            <ArrowRight className="architecture-arrow" />
            <div className="architecture-node">
              <BrainCircuit />
              <span>
                <strong>OpenAI</strong>
                Planning, vision, research
              </span>
            </div>
          </div>
          <div className="architecture-branch">
            <span>Parallel evidence acquisition</span>
            <div className="architecture-provider-grid">
              {["NASA imagery", "Weather", "Events + hazards", "USGS seismic"].map(
                (provider) => (
                  <div key={provider}>{provider}</div>
                )
              )}
            </div>
          </div>
          <div className="architecture-storage">
            <Database className="size-4 text-primary" />
            <span>
              <strong>Local investigation store</strong>
              Query JSON, imagery, Markdown, and generated PDF
            </span>
          </div>
        </Card>
      </div>

      <div className="system-section">
        <div className="system-section-heading">
          <SectionLabel>Evidence providers</SectionLabel>
          <h2>What “live” means in this product</h2>
          <p>
            Each provider has a different update cycle. Parallax shows the
            source date instead of pretending every satellite scene is
            instantaneous.
          </p>
        </div>
        <div className="source-grid">
          {sources.map(({ name, purpose, cadence, icon: SourceIcon }) => (
            <Card key={name} className="gap-4 py-5 shadow-none">
              <CardHeader className="flex-row items-center gap-3 px-5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                  <SourceIcon className="size-4" />
                </div>
                <CardTitle className="text-sm">{name}</CardTitle>
              </CardHeader>
              <CardContent className="px-5">
                <p className="text-sm leading-6 text-muted-foreground">
                  {purpose}
                </p>
                <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs font-medium">
                  <Clock3 className="size-3.5 text-primary" />
                  {cadence}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="system-split">
        <Card className="gap-5 py-6 shadow-none">
          <CardHeader className="px-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle className="mt-3 text-xl">Trust by inspection</CardTitle>
            <CardDescription className="leading-6">
              The product is designed to show its work, not just produce a
              polished sentence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-6">
            {[
              "The satellite image passed to the model is visible in the agent trace.",
              "Observations are separated from inference and paired with confidence.",
              "Every answer includes source links and explicit limitations.",
              "Provider failures degrade individually instead of collapsing the run."
            ].map((item) => (
              <div className="flex gap-3 text-sm leading-6" key={item}>
                <Check className="mt-1 size-4 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-5 border-dashed py-6 shadow-none">
          <CardHeader className="px-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
              <AlertCircle className="size-5" />
            </div>
            <CardTitle className="mt-3 text-xl">Important limits</CardTitle>
            <CardDescription className="leading-6">
              Parallax is a research prototype, not a continuous surveillance
              system or emergency decision tool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-6">
            {[
              "Satellite imagery is near-real-time, not a live video stream.",
              "Clouds, revisit schedules, and provider processing can make the best scene older.",
              "VIIRS and MODIS support regional analysis, not street-level claims.",
              "High-stakes conclusions still require authoritative local data and expert review."
            ].map((item) => (
              <div
                className="flex gap-3 text-sm leading-6 text-muted-foreground"
                key={item}
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="demo-path gap-0 overflow-hidden py-0">
        <div className="demo-path-copy">
          <SectionLabel>Suggested demo path</SectionLabel>
          <h2>Explain it, run it, inspect it.</h2>
          <p>
            Start on this page, run “Are there active wildfires near Los
            Angeles?”, expand the agent trace to show the model image, then
            finish in History and Reports.
          </p>
        </div>
        <Button size="lg" onClick={onStart}>
          Start the demo
          <ArrowRight className="size-4" />
        </Button>
      </Card>
    </section>
  );
}

function ResultPanel({
  result,
  onGenerateReport,
  reportLoading,
  savedReports,
  onOpenReport
}) {
  const weather = result.evidence.weather;

  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="gap-4 border-b py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge className="gap-1.5">
              <Sparkles className="size-3" />
              {result.mode}
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">
              {result.imagery.freshness}
            </span>
          </div>
          <div>
            <CardTitle className="text-xl leading-7">
              {result.answer.headline}
            </CardTitle>
            <CardDescription className="mt-2 text-sm leading-6">
              {result.answer.summary}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 py-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Evidence confidence</span>
              <strong>{result.answer.confidence}%</strong>
            </div>
            <Progress value={result.answer.confidence} />
          </div>

          <div className="space-y-3">
            {result.answer.observations.map((observation, index) => (
              <div className="flex gap-3" key={`${observation}-${index}`}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.65rem] font-semibold text-secondary-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-sm leading-6">{observation}</p>
              </div>
            ))}
          </div>
        </CardContent>

        <CardFooter className="block border-t bg-muted/30 py-4">
          <Button
            type="button"
            className="h-auto w-full justify-between px-4 py-3"
            onClick={() => onGenerateReport(result.id)}
            disabled={reportLoading}
          >
            <span className="flex items-center gap-3 text-left">
              {reportLoading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              <span className="grid">
                <strong>
                  {reportLoading
                    ? "Generating report..."
                    : "Generate deep research report"}
                </strong>
                <small className="font-normal opacity-75">
                  Saved as Markdown and PDF
                </small>
              </span>
            </span>
            <ArrowRight className="size-4" />
          </Button>

          {savedReports.length > 0 && (
            <div className="mt-4 space-y-2">
              <SectionLabel>Saved reports</SectionLabel>
              {savedReports.map((report) => (
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-between px-3 py-2.5"
                  key={report.id}
                  onClick={() => onOpenReport(report.id)}
                >
                  <span className="min-w-0 text-left">
                    <strong className="block truncate text-xs">
                      {report.title}
                    </strong>
                    <small className="text-muted-foreground">
                      {formatDate(report.createdAt)} · MD + PDF
                    </small>
                  </span>
                  <ArrowRight className="size-3.5" />
                </Button>
              ))}
            </div>
          )}
        </CardFooter>
      </Card>

      <Card className="snapshot-card gap-0 overflow-hidden py-0">
        <div className="snapshot-image">
          <img
            src={result.imagery.previewUrl}
            alt={`NASA satellite view around ${result.location.name}`}
          />
          <Badge variant="secondary">
            NASA GIBS · {result.imagery.label}
          </Badge>
        </div>
        <CardContent className="grid grid-cols-2 gap-4 py-4">
          <div>
            <SectionLabel>Source date</SectionLabel>
            <strong className="mt-1 block text-xs">
              {result.imagery.date} · {result.imagery.freshness}
            </strong>
          </div>
          <div>
            <SectionLabel>Selected sensor</SectionLabel>
            <strong className="mt-1 block text-xs">
              {result.imagery.label}
            </strong>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {[
          [Cloud, "Cloud cover", `${weather?.cloudCover ?? "—"}%`],
          [Layers3, "Open events", result.evidence.events.length],
          [LocateFixed, "Radius", `${result.intent.radiusKm} km`]
        ].map(([SignalIcon, label, value]) => (
          <Card key={label} className="gap-2 px-3 py-4 shadow-none">
            <SignalIcon className="size-4 text-primary" />
            <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <strong className="text-sm">{value}</strong>
          </Card>
        ))}
      </div>

      <Card className="gap-0 px-5 py-0">
        <Accordion type="multiple">
          <AccordionItem value="agent">
            <AccordionTrigger>
              <span>
                How the agent reached this answer
                <small className="ml-2 font-normal text-muted-foreground">
                  {result.trace.length} steps
                </small>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Trace trace={result.trace} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="sources">
            <AccordionTrigger>
              <span>
                Sources and limitations
                <small className="ml-2 font-normal text-muted-foreground">
                  {result.evidence.sources.length} sources
                </small>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {result.answer.caveats.map((caveat) => (
                <div
                  className="rounded-lg border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground"
                  key={caveat}
                >
                  {caveat}
                </div>
              ))}
              <div className="space-y-1">
                {result.evidence.sources.map((source) => (
                  <a
                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm font-medium hover:bg-accent"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    key={source.name}
                  >
                    <span>{source.name}</span>
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}

function EmptyLibrary({ type, onStart }) {
  const EmptyIcon = type === "reports" ? FileText : History;

  return (
    <Card className="mx-auto max-w-xl items-center px-8 py-16 text-center shadow-none">
      <div className="flex size-12 items-center justify-center rounded-xl bg-secondary">
        <EmptyIcon className="size-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">No {type} yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {type === "reports"
            ? "Generate a deep research report from any saved query."
            : "Your satellite investigations will appear here automatically."}
        </p>
      </div>
      <Button type="button" onClick={onStart}>
        Run a query
        <ArrowRight className="size-4" />
      </Button>
    </Card>
  );
}

function LibraryHeading({ eyebrow, title, description, action }) {
  return (
    <div className="library-heading">
      <div>
        <SectionLabel>{eyebrow}</SectionLabel>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function HistoryPage({ history, onOpen, onStart }) {
  return (
    <section className="library-page">
      <LibraryHeading
        eyebrow="Saved investigations"
        title="Query history"
        description="Reopen any investigation with its original imagery and evidence."
        action={
          <Button type="button" onClick={onStart}>
            New query
            <ArrowRight className="size-4" />
          </Button>
        }
      />
      {!history.length ? (
        <EmptyLibrary type="history" onStart={onStart} />
      ) : (
        <div className="library-grid">
          {history.map((item) => (
            <button
              type="button"
              className="group text-left"
              onClick={() => onOpen(item.id)}
              key={item.id}
            >
              <Card className="h-full gap-0 overflow-hidden py-0 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/50 group-hover:shadow-md">
                <div className="history-image">
                  <img src={item.imagery.previewUrl} alt="" />
                  <Badge>{item.imagery.freshness}</Badge>
                </div>
                <CardHeader className="gap-3 py-5">
                  <SectionLabel>{item.intent.label}</SectionLabel>
                  <CardTitle className="line-clamp-2 text-base leading-6">
                    {item.question}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {item.location.name}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto justify-between border-t py-3 text-xs text-muted-foreground">
                  <span>{formatDate(item.createdAt)}</span>
                  <span>
                    {item.reportIds.length
                      ? `${item.reportIds.length} report${item.reportIds.length === 1 ? "" : "s"}`
                      : `${item.answer.confidence}% confidence`}
                  </span>
                </CardFooter>
              </Card>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ReportReader({ report, onBack }) {
  return (
    <section className="report-reader">
      <div className="report-toolbar">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" />
          All reports
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={report.markdownUrl}>
              <Download className="size-4" />
              Markdown
            </a>
          </Button>
          <Button asChild>
            <a href={report.pdfUrl}>
              <Download className="size-4" />
              PDF
            </a>
          </Button>
        </div>
      </div>
      <article className="markdown-report">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {report.markdown}
        </ReactMarkdown>
      </article>
    </section>
  );
}

function ReportsPage({ reports, selectedReport, onOpen, onBack, onStart }) {
  if (selectedReport) {
    return <ReportReader report={selectedReport} onBack={onBack} />;
  }

  return (
    <section className="library-page">
      <LibraryHeading
        eyebrow="Research library"
        title="Deep research reports"
        description="Rendered reports with permanent Markdown and PDF downloads."
      />
      {!reports.length ? (
        <EmptyLibrary type="reports" onStart={onStart} />
      ) : (
        <div className="library-grid">
          {reports.map((report) => (
            <button
              type="button"
              className="group text-left"
              key={report.id}
              onClick={() => onOpen(report.id)}
            >
              <Card className="h-full gap-0 overflow-hidden py-0 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/50 group-hover:shadow-md">
                <div className="history-image">
                  <img src={report.imagery.imageUrl} alt="" />
                  <Badge variant="secondary">MD + PDF</Badge>
                </div>
                <CardHeader className="gap-3 py-5">
                  <SectionLabel>{report.imagery.label}</SectionLabel>
                  <CardTitle className="line-clamp-2 text-base leading-6">
                    {report.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 leading-5">
                    {report.question}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto justify-between border-t py-3 text-xs text-muted-foreground">
                  <span>{formatDate(report.createdAt)}</span>
                  <span className="flex items-center gap-1">
                    Open report
                    <ArrowRight className="size-3" />
                  </span>
                </CardFooter>
              </Card>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [question, setQuestion] = useState(EXAMPLES[0].query);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [health, setHealth] = useState(null);
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  async function refreshLibraries() {
    const [historyResponse, reportsResponse] = await Promise.all([
      fetch("/api/history"),
      fetch("/api/reports")
    ]);
    if (historyResponse.ok) setHistory(await historyResponse.json());
    if (reportsResponse.ok) setReports(await reportsResponse.json());
  }

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then(setHealth)
      .catch(() => setHealth({ status: "offline", aiEnabled: false }));
    refreshLibraries().catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      setActiveStep(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setActiveStep((current) =>
        Math.min(current + 1, LOADING_STEPS.length - 1)
      );
    }, 1100);
    return () => window.clearInterval(timer);
  }, [loading]);

  const statusLabel = useMemo(() => {
    if (!health) return "Connecting";
    if (health.status !== "ok") return "API offline";
    return health.aiEnabled ? "AI ready" : "Live data only";
  }, [health]);

  function navigate(nextView) {
    setView(nextView);
    setError("");
    if (nextView !== "reports") setSelectedReport(null);
  }

  async function submitQuery(event) {
    event?.preventDefault();
    if (loading || question.trim().length < 5) return;

    setView("query");
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Query failed.");
      setResult(payload);
      await refreshLibraries();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function openHistoryItem(id) {
    setError("");
    const response = await fetch(`/api/history/${id}`);
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Saved query could not be opened.");
      return;
    }
    setResult(payload);
    setQuestion(payload.question);
    setView("query");
  }

  async function generateReport(queryId) {
    setReportLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/history/${queryId}/report`, {
        method: "POST"
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Report generation failed.");
      }
      await refreshLibraries();
      setSelectedReport(payload);
      setView("reports");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setReportLoading(false);
    }
  }

  async function openReport(id) {
    const response = await fetch(`/api/reports/${id}`);
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Report could not be opened.");
      return;
    }
    setSelectedReport(payload);
    setView("reports");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="app-header">
        <button
          className="brand"
          type="button"
          onClick={() => navigate("home")}
          aria-label="Parallax home"
        >
          <span className="brand-mark">
            <Orbit className="size-5" />
          </span>
          <span className="brand-copy">
            <strong>Parallax</strong>
            <small>Agentic satellite query engine</small>
          </span>
        </button>

        <Tabs
          value={view === "academic" ? "system" : view}
          onValueChange={navigate}
          className="app-nav"
        >
          <TabsList>
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="system">
              <span className="nav-how-desktop">How it works</span>
              <span className="nav-how-mobile">System</span>
            </TabsTrigger>
            <TabsTrigger value="query">Explore</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="header-actions">
          <Badge variant="outline" className="system-status">
            <span
              className={`size-1.5 rounded-full ${
                health?.status === "ok" ? "bg-primary" : "bg-destructive"
              }`}
            />
            {statusLabel}
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      {error && (
        <div className="global-error">
          <AlertCircle className="size-4" />
          <span>{error}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setError("")}>
            Dismiss
          </Button>
        </div>
      )}

      {view === "home" && (
        <LandingPage
          onStart={() => navigate("query")}
          onReports={() => navigate("reports")}
          onHowItWorks={() => navigate("system")}
        />
      )}

      {view === "system" && (
        <HowItWorksPage
          onStart={() => navigate("query")}
          onAcademic={() => navigate("academic")}
        />
      )}

      {view === "academic" && (
        <Suspense
          fallback={
            <div className="academic-loading">
              <LoaderCircle className="size-5 animate-spin text-primary" />
              Loading academic documentation
            </div>
          }
        >
          <AcademicSystemPage
            onOverview={() => navigate("system")}
            onStart={() => navigate("query")}
          />
        </Suspense>
      )}

      {view === "query" && (
        <section className="workspace">
          <SatelliteMap result={result} loading={loading} />

          <aside className="query-rail">
            <div className="rail-scroll">
              <div className="query-header">
                <Badge variant="outline">Observation request</Badge>
                <h1>Ask about any place</h1>
                <p>
                  Parallax selects the freshest imagery and checks it against
                  live environmental evidence.
                </p>
              </div>

              <Card className="gap-4 py-5 shadow-none">
                <CardHeader className="px-5">
                  <CardTitle className="text-sm">Earth question</CardTitle>
                </CardHeader>
                <CardContent className="px-5">
                  <form className="space-y-3" onSubmit={submitQuery}>
                    <Textarea
                      id="earth-question"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      maxLength={280}
                      rows={4}
                      placeholder="Is there flooding near Jakarta right now?"
                      aria-label="Earth question"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {question.length} / 280
                      </span>
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Search className="size-4" />
                        )}
                        {loading ? "Observing" : "Run query"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {!result && !loading && (
                <div className="space-y-3">
                  <SectionLabel>Example questions</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {EXAMPLES.map((example) => (
                      <Button
                        key={example.query}
                        type="button"
                        variant="outline"
                        className="h-auto justify-start px-3 py-3 text-left"
                        onClick={() => setQuestion(example.query)}
                      >
                        <span className="grid">
                          <strong className="text-xs">{example.label}</strong>
                          <small className="font-normal text-muted-foreground">
                            {example.place}
                          </small>
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <Trace trace={null} loading activeStep={activeStep} />
              )}

              {result && !loading && (
                <>
                  <Separator />
                  <ResultPanel
                    result={result}
                    onGenerateReport={generateReport}
                    reportLoading={reportLoading}
                    savedReports={reports.filter(
                      (report) => report.queryId === result.id
                    )}
                    onOpenReport={openReport}
                  />
                </>
              )}
            </div>
          </aside>
        </section>
      )}

      {view === "history" && (
        <HistoryPage
          history={history}
          onOpen={openHistoryItem}
          onStart={() => navigate("query")}
        />
      )}

      {view === "reports" && (
        <ReportsPage
          reports={reports}
          selectedReport={selectedReport}
          onOpen={openReport}
          onBack={() => setSelectedReport(null)}
          onStart={() => navigate("query")}
        />
      )}
    </main>
  );
}
