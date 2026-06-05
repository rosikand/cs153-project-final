import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search, Satellite, Brain, FileText, FlaskConical, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import TopNav from '@/components/TopNav.jsx'
import { getEval } from '@/api'

const CAPABILITIES = [
  '7 satellite tools',
  'Vision-grounded',
  'Historical dates',
  'Active fires (FIRMS)',
  'NDVI vegetation',
  'Change detection',
  'Conversation memory',
  'Agent trace',
  'Deep-research reports (PDF)',
]
const MODEL_LABELS = { opus: 'Claude Opus 4.8', sonnet: 'Claude Sonnet 4.6' }

const STEPS = [
  { icon: Search, title: '1 · Locate', body: 'The agent geocodes your question to a precise bounding box on Earth (OpenStreetMap).' },
  { icon: Satellite, title: '2 · Acquire', body: 'It chooses and fetches the right live data source(s) for the question — and for a specific date if you asked about the past.' },
  { icon: Brain, title: '3 · Analyse', body: 'The fetched imagery is fed back to Claude as vision input. It reads the actual pixels — plumes, water extent, NDVI, fire points.' },
  { icon: FileText, title: '4 · Answer', body: 'You get a grounded answer on the map, and can turn any query into a cited deep-research report (markdown + PDF).' },
]

const TOOLS = [
  ['get_active_fires', 'NASA FIRMS', 'Real active-fire detection points (VIIRS), updated hourly — counts, confidence, radiative power.'],
  ['get_realtime_imagery', 'NASA GIBS', 'Daily global imagery (~250m–1km) + full historical archive. Smoke, floods, snow, storms.'],
  ['get_highres_imagery', 'Sentinel-2 (Planetary Computer)', '~10m true-color, least-cloudy recent scene. Cities, water, coastlines.'],
  ['get_basemap_imagery', 'Esri World Imagery', 'Sub-meter static mosaic. Finest detail — buildings, runways, ships.'],
  ['get_vegetation_index', 'Sentinel-2 NDVI', 'Real spectral math (B08/B04) → vegetation health with mean/min/max + % healthy.'],
  ['compare_over_time', 'Sentinel-2 (two dates)', 'Change detection — before/after scenes for any two dates.'],
]

export default function HowItWorks() {
  const [evalData, setEvalData] = useState(null)
  useEffect(() => {
    getEval().then(setEvalData).catch(() => setEvalData({ available: false }))
  }, [])

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Badge variant="outline" className="mb-4">For the demo</Badge>
        <h1 className="text-4xl font-bold tracking-tight">How Parallax works</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Parallax is an <strong className="text-foreground">agentic</strong> system: instead of answering from memory, an
          LLM agent uses tools to pull live satellite data and reasons over the real pixels.
        </p>

        {/* At-a-glance capability chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          {CAPABILITIES.map((c) => (
            <Badge key={c} variant="secondary">{c}</Badge>
          ))}
        </div>

        {/* Pipeline */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-card p-5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Architecture diagram */}
        <h2 className="mt-16 text-2xl font-semibold">Architecture</h2>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-card p-5 text-xs leading-relaxed text-muted-foreground">
{`  Browser (React + Leaflet)
        │  question
        ▼
  FastAPI  ──►  Claude agent loop  ──►  tools ──► satellite APIs
        ▲             │                          (GIBS · Sentinel-2 ·
        │   imagery as vision input               Esri · FIRMS)
        └─────────────┘
        │  streamed reasoning + imagery (SSE)
        ▼
  Map overlay + answer  ──►  one-click deep-research report (md + PDF)`}
        </pre>

        {/* Tools table */}
        <h2 className="mt-16 text-2xl font-semibold">The agent's tools</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="p-3 text-left font-medium">Tool</th>
                <th className="p-3 text-left font-medium">Source</th>
                <th className="p-3 text-left font-medium">What it does</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map(([t, src, body]) => (
                <tr key={t} className="border-t border-border">
                  <td className="p-3 align-top font-mono text-xs text-primary">{t}</td>
                  <td className="p-3 align-top text-xs">{src}</td>
                  <td className="p-3 align-top text-muted-foreground">{body}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          All data sources are free and open — no paid satellite keys. Plus conversation memory for follow-ups,
          query history, and saved reports.
        </p>

        {/* Evaluation */}
        <h2 className="mt-16 flex items-center gap-2 text-2xl font-semibold">
          <FlaskConical className="size-6 text-primary" /> How we know it works
        </h2>
        <p className="mt-3 text-muted-foreground">
          We don't just claim it works — we measured it. A reproducible benchmark of geospatial prompts spanning
          environmental, consumer, and finance use cases runs the <strong className="text-foreground">full agent</strong>
          {' '}(real satellite tool calls) and grades every answer with an LLM judge on four dimensions:
          tool selection, groundedness, correctness, and clarity.
        </p>

        {evalData?.available && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Object.entries(evalData.summary.by_model).map(([m, s], i) => (
              <Card key={m} className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    {MODEL_LABELS[m] || m} {i === 0 && <Trophy className="size-3.5 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.avg_latency_s}s avg latency · {s.n} prompts</div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold tabular-nums">{s.overall}</span>
                  <span className="text-sm text-muted-foreground"> / 5</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/benchmark">
              See the full benchmark <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-8">
          <Button asChild size="lg">
            <Link to="/app">
              Try it now <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/impact">Read the impact</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
