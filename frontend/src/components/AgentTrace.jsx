import { useState } from 'react'
import { Route, Wrench, Database, ChevronDown, Brain } from 'lucide-react'

const TOOL_LABELS = {
  geocode_location: 'Geocode location',
  get_realtime_imagery: 'Real-time imagery · NASA GIBS',
  get_highres_imagery: 'High-res imagery · Sentinel-2',
  get_basemap_imagery: 'High-detail imagery · Esri',
  get_active_fires: 'Active fires · NASA FIRMS',
  get_vegetation_index: 'Vegetation index · NDVI',
  compare_over_time: 'Change detection · two dates',
}

// Map a data source string to a plain-English limitation.
const SOURCE_INFO = [
  ['FIRMS', 'NASA FIRMS active fires', 'Thermal hotspot detections; needs a FIRMS key (falls back to GIBS imagery otherwise); small/cool fires can be missed.'],
  ['NDVI', 'Sentinel-2 NDVI', '~10 m vegetation index; a single-date snapshot, and cloud/haze can bias the values.'],
  ['GIBS', 'NASA GIBS daily imagery', '~250 m–1 km resolution — great for large-scale & real-time, too coarse to resolve buildings; ~1-day latency.'],
  ['Sentinel-2', 'Sentinel-2 imagery', '~10 m resolution; ~5-day revisit, so "recent" may be a few days old; cloud cover can obscure the scene.'],
  ['Esri', 'Esri World Imagery', 'Sub-meter detail, but a static mosaic that is months-to-years old — NOT real-time.'],
]

function sourceInfo(src = '') {
  const hit = SOURCE_INFO.find(([m]) => src.includes(m))
  return hit ? { label: hit[1], note: hit[2] } : { label: src, note: '' }
}

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 text-primary" /> {title}
      </div>
      {children}
    </div>
  )
}

export default function AgentTrace({ steps }) {
  const [open, setOpen] = useState(false)

  const toolCalls = steps.filter((s) => s.type === 'tool_call')
  const reasonings = steps.filter((s) => s.type === 'reasoning')
  if (toolCalls.length === 0 && reasonings.length === 0) return null

  // Sources used, deduped by label, with date/cloud where available.
  const sourceMap = new Map()
  for (const s of steps) {
    const collect = (src, date, cloud) => {
      const info = sourceInfo(src)
      if (!sourceMap.has(info.label)) sourceMap.set(info.label, { ...info, dates: new Set(), cloud })
      if (date) sourceMap.get(info.label).dates.add(date)
    }
    if (s.type === 'imagery') collect(s.source, s.date, s.cloud_cover)
    else if (s.type === 'fires') collect(s.source, null)
    else if (s.type === 'comparison') (s.frames || []).forEach((f) => collect(s.source, f.date))
  }
  const sources = [...sourceMap.values()]

  // An ordered reasoning+tool timeline.
  const timeline = steps.filter((s) => s.type === 'reasoning' || s.type === 'tool_call')

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 p-2.5 text-left text-[12px] font-medium">
        <Route className="size-3.5 text-primary" />
        How the agent reached this answer
        <span className="text-muted-foreground">· {toolCalls.length} tool{toolCalls.length !== 1 ? 's' : ''}</span>
        <ChevronDown className={`ml-auto size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-3">
          {/* Reasoning + tool timeline */}
          <Section icon={Brain} title="Reasoning path">
            <ol className="relative space-y-2 border-l border-border pl-4">
              {timeline.map((s, i) => (
                <li key={i} className="relative">
                  <span className={`absolute -left-[1.32rem] top-1 size-2 rounded-full ${s.type === 'tool_call' ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  {s.type === 'reasoning' ? (
                    <p className="text-[12px] italic leading-snug text-muted-foreground">{s.text}</p>
                  ) : (
                    <p className="text-[12px] leading-snug">
                      <span className="text-primary">→ {TOOL_LABELS[s.name] || s.name}</span>
                      {s.input?.query && <span className="text-muted-foreground"> · “{s.input.query}”</span>}
                      {s.input?.date && <span className="text-muted-foreground"> · {s.input.date}</span>}
                      {s.input?.date_a && <span className="text-muted-foreground"> · {s.input.date_a} → {s.input.date_b}</span>}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Section>

          {/* Tools called & sequence */}
          <Section icon={Wrench} title="Tools called & sequence">
            <ol className="space-y-1">
              {toolCalls.map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary">{i + 1}</span>
                  <span>{TOOL_LABELS[t.name] || t.name}</span>
                </li>
              ))}
            </ol>
          </Section>

          {/* Sources & limitations */}
          <Section icon={Database} title="Sources & limitations">
            {sources.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No imagery sources recorded for this step.</p>
            ) : (
              <ul className="space-y-2">
                {sources.map((s, i) => (
                  <li key={i} className="text-[12px]">
                    <div className="font-medium">
                      {s.label}
                      {s.dates.size > 0 && <span className="font-normal text-muted-foreground"> · {[...s.dates].join(', ')}</span>}
                    </div>
                    {s.note && <div className="text-[11px] leading-snug text-muted-foreground">{s.note}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </div>
  )
}
