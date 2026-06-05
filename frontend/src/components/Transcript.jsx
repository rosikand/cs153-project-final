import { MapPin, Flame, Leaf, Layers, Satellite, Clock, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import BeforeAfter from './BeforeAfter.jsx'
import AgentTrace from './AgentTrace.jsx'
import Markdown from './Markdown.jsx'

const TOOL_META = {
  geocode_location: { icon: Search, label: (i) => `Locating “${i.query}”` },
  get_realtime_imagery: { icon: Satellite, label: () => 'Near-real-time imagery (NASA GIBS)' },
  get_highres_imagery: { icon: Satellite, label: () => 'High-res imagery (Sentinel-2)' },
  get_basemap_imagery: { icon: Layers, label: () => 'High-detail imagery (Esri World Imagery)' },
  get_active_fires: { icon: Flame, label: () => 'Active fires (NASA FIRMS)' },
  get_vegetation_index: { icon: Leaf, label: () => 'Vegetation index (NDVI)' },
  compare_over_time: { icon: Clock, label: () => 'Change detection (two dates)' },
}

function Imagery({ ev }) {
  const isNdvi = ev.variant === 'ndvi'
  return (
    <div className="animate-in-soft overflow-hidden rounded-lg border border-border bg-card">
      <img src={ev.url} alt={ev.source} loading="lazy" className="aspect-square w-full object-cover" />
      {isNdvi && (
        <div className="flex items-center gap-2 px-3 pt-2 text-[10px] text-muted-foreground">
          <span>stressed</span>
          <div className="h-2 flex-1 rounded" style={{ background: 'linear-gradient(to right,#a50026,#f46d43,#fee08b,#a6d96a,#1a9850)' }} />
          <span>healthy</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 p-3 text-[11px] text-muted-foreground">
        <Badge variant="default">{ev.source}</Badge>
        {ev.date && <span>📅 {ev.date}</span>}
        {ev.cloud_cover != null && <span>☁️ {ev.cloud_cover.toFixed(0)}%</span>}
        {isNdvi && ev.stats && (
          <span className="text-primary">mean NDVI {ev.stats.mean} · {ev.stats.healthy_pct}% healthy</span>
        )}
      </div>
    </div>
  )
}

function Fires({ ev }) {
  const none = ev.count === 0
  return (
    <div
      className={`animate-in-soft rounded-lg border p-3 ${
        none ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Flame className={`size-4 ${none ? 'text-emerald-500' : 'text-red-500'}`} />
        {none ? 'No active fires detected' : `${ev.count} active fire detection${ev.count > 1 ? 's' : ''}`}
        {ev.truncated && <span className="font-normal text-muted-foreground">(strongest shown)</span>}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{ev.source}</div>
    </div>
  )
}

function Comparison({ ev }) {
  return (
    <div className="animate-in-soft overflow-hidden rounded-lg border border-border bg-card">
      <BeforeAfter frames={ev.frames} />
      <div className="px-3 pb-3">
        <Badge variant="default">{ev.source}</Badge>
      </div>
    </div>
  )
}

function Step({ icon: Icon, children, muted }) {
  return (
    <div className={`flex items-center gap-2 text-[13px] ${muted ? 'text-muted-foreground' : ''}`}>
      {Icon ? (
        <Icon className="size-3.5 shrink-0 text-primary" />
      ) : (
        <span className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
      )}
      <span>{children}</span>
    </div>
  )
}

export function AnswerCard({ text, streaming = false }) {
  return (
    <div className="animate-in-soft rounded-xl border border-border bg-card/70 p-3.5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-[13px] text-primary">◐</span>
        <span className="text-xs font-semibold">Parallax</span>
        <span className="ml-auto text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Analysis</span>
      </div>
      <Markdown>{text}</Markdown>
      {streaming && (
        <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-primary align-middle" />
      )}
    </div>
  )
}

export function TranscriptEvent({ ev }) {
  switch (ev.type) {
    case 'user':
      return (
        <div className="ml-auto max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-[13px] text-primary-foreground">
          {ev.text}
        </div>
      )
    case 'answer':
      return <AnswerCard text={ev.text} />
    case 'imagery':
      return <Imagery ev={ev} />
    case 'fires':
      return <Fires ev={ev} />
    case 'comparison':
      return <Comparison ev={ev} />
    case 'reasoning':
      return (
        <div className="flex gap-2 text-[12px] italic leading-snug text-muted-foreground">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
          <span>{ev.text}</span>
        </div>
      )
    case 'location':
      return (
        <Step icon={MapPin}>
          Pinned <strong>{ev.name.split(',')[0]}</strong>
        </Step>
      )
    case 'tool_call': {
      const m = TOOL_META[ev.name]
      return <Step icon={m?.icon}>{m ? m.label(ev.input) : ev.name}</Step>
    }
    case 'status':
      return <Step muted>{ev.message}</Step>
    default:
      return null
  }
}

// Group a flat event stream into conversation turns so each answer can carry
// its own agent-trace summary.
function groupTurns(events) {
  const turns = []
  let cur = null
  const ensure = () => {
    if (!cur) {
      cur = { user: null, steps: [], answer: null }
      turns.push(cur)
    }
  }
  for (const ev of events) {
    if (ev.type === 'user') {
      cur = { user: ev, steps: [], answer: null }
      turns.push(cur)
    } else if (ev.type === 'answer') {
      ensure()
      cur.answer = ev
    } else {
      ensure()
      cur.steps.push(ev)
    }
  }
  return turns
}

export default function Transcript({ events, className = '' }) {
  const turns = groupTurns(events)
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {turns.map((turn, ti) => (
        <div key={ti} className="flex flex-col gap-3">
          {turn.user && <TranscriptEvent ev={turn.user} />}
          {turn.steps.map((ev, i) => (
            <TranscriptEvent key={i} ev={ev} />
          ))}
          {turn.answer && <TranscriptEvent ev={turn.answer} />}
          {turn.answer && <AgentTrace steps={turn.steps} />}
        </div>
      ))}
    </div>
  )
}
