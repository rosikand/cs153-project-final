import { Link } from 'react-router-dom'
import { ArrowRight, Flame, Leaf, Clock, Satellite, FileText, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TopNav from '@/components/TopNav.jsx'

const FEATURES = [
  { icon: Satellite, title: 'Multi-source imagery', body: 'NASA GIBS (daily), Sentinel-2 (10m), and Esri (sub-meter) — the agent picks the right one per question.' },
  { icon: Flame, title: 'Live fire detection', body: 'Real NASA FIRMS active-fire points with exact counts, confidence, and radiative power.' },
  { icon: Leaf, title: 'Vegetation health', body: 'Real NDVI from Sentinel-2 bands — quantitative crop & drought analysis, not eyeballing green.' },
  { icon: Clock, title: 'Change over time', body: 'Before/after change detection across years: shrinking lakes, deforestation, urban growth.' },
  { icon: History, title: 'Historical queries', body: '“Was it snowing on Mount Fuji in March 2022?” — it fetches the imagery for that date.' },
  { icon: FileText, title: 'Deep-research reports', body: 'One click turns any query into a cited multi-section report, saved as rendered markdown + PDF.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen">
      <TopNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--primary),transparent_55%)] opacity-15" />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <Badge variant="outline" className="mb-5">
            <span className="text-primary">●</span> Powered by Claude + open satellite data
          </Badge>
          <h1 className="text-balance text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Ask the planet anything.
            <br />
            <span className="bg-gradient-to-r from-primary to-chart-cyan bg-clip-text text-transparent">
              Answered from orbit.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Parallax is an agentic satellite query engine. Ask a question about anywhere on Earth —
            it locates the place, pulls live satellite data, analyses the actual pixels, and answers.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/app">
                Launch the engine <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
          <div className="mx-auto mt-12 max-w-2xl rounded-xl border border-border bg-card/60 p-4 text-left shadow-sm backdrop-blur">
            <div className="text-xs text-muted-foreground">Try asking…</div>
            <div className="mt-2 space-y-1.5 font-mono text-sm">
              <div className="text-foreground">› Are there active wildfires near Athens right now?</div>
              <div className="text-foreground">› How has Lake Mead changed since 2016?</div>
              <div className="text-foreground">› Was it snowing on Mount Fuji in March 2022?</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        <div className="mb-3 flex justify-center gap-5">
          <Link to="/how-it-works" className="hover:text-foreground">How it works</Link>
          <Link to="/impact" className="hover:text-foreground">Impact</Link>
          <Link to="/benchmark" className="hover:text-foreground">Benchmark</Link>
        </div>
        Parallax · Agentic Satellite Query Engine — a course project demonstrating agentic tool use over open geospatial data.
      </footer>
    </div>
  )
}
