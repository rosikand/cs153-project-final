import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Loader2, Trophy, Timer, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import TopNav from '@/components/TopNav.jsx'
import { getEval } from '@/api'

const DIM_LABELS = {
  tool_use: 'Tool selection',
  groundedness: 'Groundedness',
  correctness: 'Correctness',
  clarity: 'Clarity & honesty',
}
const MODEL_COLORS = { opus: 'var(--primary)', sonnet: 'var(--chart-cyan)' }
const MODEL_LABELS = { opus: 'Opus 4.8', sonnet: 'Sonnet 4.6' }

function ScoreBar({ value, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${(value / 5) * 100}%`, background: color }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums">{value?.toFixed?.(2) ?? value}</span>
    </div>
  )
}

function CaseRow({ runs, dimensions }) {
  const [open, setOpen] = useState(false)
  const any = runs[0]
  return (
    <div className="rounded-lg border border-border bg-card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-3 text-left">
        <Badge variant="outline" className="shrink-0">{any.domain}</Badge>
        <span className="flex-1 text-[13px] font-medium">{any.prompt}</span>
        <div className="flex shrink-0 items-center gap-3">
          {runs.map((r) => (
            <span key={r.model} className="flex items-center gap-1 text-xs">
              <span style={{ color: MODEL_COLORS[r.model] }}>●</span>
              <span className="tabular-nums">{r.scores.overall}</span>
            </span>
          ))}
          <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="space-y-4 border-t border-border p-3">
          {runs.map((r) => (
            <div key={r.model}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                <span style={{ color: MODEL_COLORS[r.model] }}>{MODEL_LABELS[r.model]}</span>
                <span className="font-normal text-muted-foreground">
                  · {r.latency_s}s · tools: {r.tools_used.join(', ') || 'none'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {Object.keys(dimensions).map((d) => (
                  <div key={d} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[11px] text-muted-foreground">{DIM_LABELS[d]}</span>
                    <ScoreBar value={r.scores[d]} color={MODEL_COLORS[r.model]} />
                  </div>
                ))}
              </div>
              {r.scores.rationale && (
                <p className="mt-2 text-[11px] italic text-muted-foreground">“{r.scores.rationale}”</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Benchmark() {
  const [data, setData] = useState(undefined)

  useEffect(() => {
    getEval().then(setData).catch(() => setData({ available: false }))
  }, [])

  if (data === undefined)
    return (
      <Shell>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading results…
        </div>
      </Shell>
    )

  if (!data.available)
    return (
      <Shell>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <FlaskConical className="mx-auto size-8 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Benchmark not run yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Generate results with <code className="rounded bg-muted px-1.5 py-0.5">.venv/bin/python eval/run_eval.py</code> from the backend, then reload.
          </p>
        </div>
      </Shell>
    )

  const models = Object.keys(data.summary.by_model)
  const cases = Object.values(
    data.runs.reduce((acc, r) => {
      ;(acc[r.id] ||= []).push(r)
      return acc
    }, {}),
  )
  const best = models.reduce((a, b) => (data.summary.by_model[a].overall >= data.summary.by_model[b].overall ? a : b), models[0])

  return (
    <Shell>
      <Badge variant="outline" className="mb-4">Evaluation</Badge>
      <h1 className="text-4xl font-bold tracking-tight">How good is it, really?</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        We built a {data.n_cases}-prompt benchmark spanning environmental, consumer, and finance use cases, ran the full
        agent (with real satellite tool calls) on each, and graded every answer with an LLM judge across four dimensions.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">Judge: {data.judge_model}</Badge>
        <Badge variant="secondary">{data.n_cases} prompts × {models.length} models</Badge>
        <Badge variant="secondary">Run {data.generated_at?.replace('T', ' ')}</Badge>
      </div>

      {/* Headline cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {models.map((m) => (
          <Card key={m} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold" style={{ color: MODEL_COLORS[m] }}>
                {MODEL_LABELS[m]} {m === best && <Trophy className="size-4" />}
              </div>
              <code className="text-[10px] text-muted-foreground">{data.model_ids[m]}</code>
            </div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold tabular-nums">{data.summary.by_model[m].overall}</span>
              <span className="mb-1 text-sm text-muted-foreground">/ 5 overall</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Timer className="size-3.5" /> {data.summary.by_model[m].avg_latency_s}s avg latency
            </div>
          </Card>
        ))}
      </div>

      {/* Scores by dimension */}
      <h2 className="mt-12 text-2xl font-semibold">Scores by dimension</h2>
      <Card className="mt-4 divide-y divide-border">
        {Object.entries(data.dimensions).map(([d, desc]) => (
          <div key={d} className="p-4">
            <div className="flex items-baseline justify-between">
              <div className="font-medium">{DIM_LABELS[d] || d}</div>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">{desc}</p>
            <div className="space-y-1.5">
              {models.map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs" style={{ color: MODEL_COLORS[m] }}>{MODEL_LABELS[m]}</span>
                  <ScoreBar value={data.summary.by_model[m][d]} color={MODEL_COLORS[m]} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>

      {/* By domain */}
      <h2 className="mt-12 text-2xl font-semibold">By use-case domain</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-3 text-left font-medium">Domain</th>
              {models.map((m) => (
                <th key={m} className="p-3 text-left font-medium" style={{ color: MODEL_COLORS[m] }}>{MODEL_LABELS[m]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.summary.domains.map((dom) => (
              <tr key={dom} className="border-t border-border">
                <td className="p-3 font-medium">{dom}</td>
                {models.map((m) => (
                  <td key={m} className="p-3 tabular-nums">{data.summary.by_model_domain[m]?.[dom] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-prompt */}
      <h2 className="mt-12 text-2xl font-semibold">Every prompt, graded</h2>
      <p className="mt-1 text-sm text-muted-foreground">Click a row to see per-dimension scores, the tools each model used, and the judge's rationale.</p>
      <div className="mt-4 space-y-2">
        {cases.map((runs) => (
          <CaseRow key={runs[0].id} runs={runs.sort((a, b) => a.model.localeCompare(b.model))} dimensions={data.dimensions} />
        ))}
      </div>

      {/* Methodology */}
      <h2 className="mt-12 text-2xl font-semibold">Methodology & honest caveats</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Each prompt runs the <strong className="text-foreground">full agent</strong> — real geocoding and live satellite tool calls — so scores reflect the end-to-end system, not a model in isolation.</li>
        <li>Grading is <strong className="text-foreground">LLM-as-judge</strong> ({data.judge_model}, held fixed for fairness) scoring the response's tool choice, groundedness, plausibility, and clarity. The judge reads the answer and the tools invoked; it does not independently re-verify the pixels, so groundedness measures whether the answer <em>cites</em> concrete imagery, not ground truth.</li>
        <li>This is a <strong className="text-foreground">small benchmark ({data.n_cases} prompts)</strong> meant to be illustrative and reproducible, not a statistically powered study. Fire prompts reflect graceful fallback when no FIRMS key is configured.</li>
      </ul>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-8">
        <Button asChild size="lg"><Link to="/app">Try the engine →</Link></Button>
        <Button asChild size="lg" variant="outline"><Link to="/impact">Read the impact piece</Link></Button>
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="mx-auto max-w-4xl px-6 py-14">{children}</div>
    </div>
  )
}
