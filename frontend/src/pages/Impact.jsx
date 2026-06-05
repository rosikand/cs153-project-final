import { Link } from 'react-router-dom'
import { ArrowRight, Globe2, Compass, TrendingUp, Quote, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import TopNav from '@/components/TopNav.jsx'

const AUDIENCES = [
  {
    icon: Globe2,
    tag: 'Environment',
    title: 'Response & conservation',
    problem:
      'When a wildfire breaks out, a river floods, or a forest is cleared, the people who must act — responders, conservation NGOs, local officials — are often furthest from the satellite tooling. They wait hours or days for a map.',
    does: [
      ['“Active fires near this town right now?”', 'NASA FIRMS hotspots in seconds'],
      ['“How much has this reservoir shrunk since 2017?”', 'before/after swipe with real dates'],
      ['“Is there new deforestation near here?”', 'high-res Sentinel-2, clearing called out'],
    ],
    impact: [
      'Faster disaster response — minutes, not a morning.',
      'Democratized monitoring — a small nonprofit gets lab-grade answers with no GIS team.',
      'Accountability — anyone can independently verify land-use claims.',
    ],
  },
  {
    icon: Compass,
    tag: 'Consumer',
    title: 'Everyday & the curious',
    problem:
      'Ordinary questions about the physical world — is there snow on the mountain for my trip? what does this beach look like? did it flood near my family? — have no good answer today. You get stale photos or guesses.',
    does: [
      ['“Is there snow on Mount Fuji right now?”', 'recent imagery, summit checked'],
      ['“Was there snow in Aspen at Christmas 2023?”', 'imagery from that exact date'],
      ['“What does the Long Beach waterfront look like?”', 'sub-meter Esri detail'],
    ],
    impact: [
      'Trip & activity planning grounded in current conditions.',
      'Local awareness — check on family after a storm, anywhere.',
      'Curiosity & education — the planet becomes browsable.',
    ],
  },
  {
    icon: TrendingUp,
    tag: 'Finance',
    title: 'Hedge funds & alt-data',
    problem:
      'Markets move on information that arrives before the official report. "Geospatial alpha" — crop vigor, oil storage, port activity from orbit — is real but today is the preserve of funds with six-figure data subscriptions and analyst teams.',
    does: [
      ['“Crop health (NDVI) across Iowa this season?”', 'a quantitative yield signal'],
      ['“Has storage at the Cushing oil hub changed?”', 'change detection over the tank farm'],
      ['“Congestion or flooding at the Port of Shanghai?”', 'a supply-chain read'],
    ],
    impact: [
      'Earlier signals — crop stress or port congestion ahead of lagging statistics.',
      'Lower barrier to alt-data — a first-pass read in seconds.',
      'Auditable theses — every answer ships with the dated image behind it.',
    ],
  },
]

export default function Impact() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="mx-auto max-w-5xl px-6 py-14">
        <Badge variant="outline" className="mb-4">Impact</Badge>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          One question, three industries: <span className="text-primary">what's happening on the ground?</span>
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          Satellites image the whole Earth every day — petabytes of open data almost nobody can use, because it takes a
          GIS specialist and hours of work. Parallax collapses that to a sentence. Here's who that unlocks, and how.
        </p>

        {/* Audience cards */}
        <div className="mt-10 space-y-6">
          {AUDIENCES.map((a) => (
            <Card key={a.tag} className="overflow-hidden">
              <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                <div className="border-b border-border bg-muted/40 p-5 md:border-b-0 md:border-r">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <a.icon className="size-6" />
                  </div>
                  <Badge variant="secondary" className="mt-3">{a.tag}</Badge>
                  <h2 className="mt-1.5 text-xl font-semibold leading-tight">{a.title}</h2>
                  <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{a.problem}</p>
                </div>
                <div className="p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ask it</div>
                  <ul className="mt-2 space-y-2">
                    {a.does.map(([q, r]) => (
                      <li key={q} className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <span className="text-[13px] font-medium">{q}</span>
                        <span className="text-[11px] text-primary">{r}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Potential impact</div>
                  <ul className="mt-2 space-y-1">
                    {a.impact.map((i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Why agentic */}
        <Card className="mt-8 p-6">
          <h2 className="text-xl font-semibold">Why <span className="text-primary">agentic</span> is the unlock</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            None of this works as a static dashboard — the questions are open-ended. The value comes from an agent that
            <strong className="text-foreground"> chooses</strong> the right source per question (daily vs. 10-meter vs. sub-meter;
            real-time vs. a historical date; fires vs. vegetation vs. change-over-time), <strong className="text-foreground"> fetches</strong> it
            live, and <strong className="text-foreground"> reasons over the actual pixels</strong> — then hands you the evidence. That's
            the difference between <em>a pile of satellite data</em> and <em>an answer</em>.
          </p>
        </Card>

        {/* Evidence / evaluation */}
        <Card className="mt-6 border-primary/30 bg-primary/5 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <FlaskConical className="size-4" /> Does it actually work? We measured it.
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Impact only matters if the answers are trustworthy. We built a 9-prompt benchmark across these exact three
            domains and graded the full agent with an LLM judge on tool choice, groundedness, correctness, and clarity —
            <strong className="text-foreground"> Claude Opus scored 4.22/5</strong>, strongest on the Finance and Consumer
            use cases. Every answer in the product also ships with its sources and limitations.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/benchmark">See the full evaluation →</Link>
          </Button>
        </Card>

        {/* Caveat */}
        <div className="mt-6 flex gap-3 rounded-lg border-l-2 border-amber-500 bg-amber-500/10 p-4 text-[13px] text-muted-foreground">
          <Quote className="size-4 shrink-0 text-amber-500" />
          <p>
            A note on rigor: for regulated or capital-at-risk decisions, Parallax is a fast <em>first look</em>, not a system
            of record. It surfaces the imagery and a grounded read; it does not replace gauge data, official statistics, or
            sub-meter tasking.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-8">
          <Button asChild size="lg">
            <Link to="/app">Try a query <ArrowRight className="size-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/how-it-works">How it works</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
