import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Loader2, Plus, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Transcript, { TranscriptEvent, AnswerCard } from './Transcript.jsx'

const EXAMPLES = [
  'Are there active wildfires near Athens, Greece right now?',
  'How healthy are the crops in the Imperial Valley?',
  'How has Lake Mead changed since 2016?',
  'Was it snowing on Mount Fuji in March 2022?',
  'Show me the port of Long Beach in detail',
]

export default function QueryPanel({
  question,
  setQuestion,
  onSubmit,
  onReset,
  onGenerateReport,
  running,
  reporting,
  reportEvents,
  events,
  answer,
  error,
  canReport,
}) {
  const scrollRef = useRef(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [events, answer, reportEvents])

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {events.length === 0 && !running && (
          <div className="animate-in-soft">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-xl text-primary">◐</span>
              <div>
                <div className="font-semibold">Ask the planet anything</div>
                <div className="text-xs text-muted-foreground">Live satellite intelligence, grounded in the pixels.</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Parallax locates anywhere on Earth, pulls live satellite data — imagery, active fires,
              vegetation health, change over time — and analyses it for you.
            </p>
            <div className="mt-4 mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Try one of these
            </div>
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQuestion(ex)}
                  disabled={running}
                  className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-[13px] transition-all hover:border-primary hover:bg-accent disabled:opacity-50"
                >
                  <span className="text-primary opacity-60 transition-opacity group-hover:opacity-100">›</span>
                  {ex}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              New here?{' '}
              <Link to="/how-it-works" className="text-primary hover:underline">
                See how it works →
              </Link>
            </p>
          </div>
        )}

        <Transcript events={events} />

        {answer && <AnswerCard text={answer} streaming={running} />}

        {running && !answer && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3.5 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" /> analysing imagery…
          </div>
        )}

        {/* Deep-research report generation progress */}
        {reportEvents.length > 0 && (
          <div className="animate-in-soft rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" /> Generating deep-research report…
            </div>
            <div className="space-y-2">
              {reportEvents.map((ev, i) => (
                <TranscriptEvent key={i} ev={ev} />
              ))}
            </div>
          </div>
        )}

        {canReport && !running && !reporting && (
          <Button variant="outline" size="sm" className="w-full" onClick={onGenerateReport}>
            <FileText className="size-4" /> Generate deep-research report
          </Button>
        )}
        {reporting && (
          <Button variant="outline" size="sm" className="w-full" disabled>
            <Loader2 className="size-4 animate-spin" /> Researching & writing report…
          </Button>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            ⚠ {error}
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!running && question.trim()) onSubmit()
        }}
      >
        {events.length > 0 && (
          <Button type="button" variant="ghost" size="icon" onClick={onReset} disabled={running} title="New conversation">
            <Plus className="size-4" />
          </Button>
        )}
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about anywhere on Earth…"
          disabled={running}
        />
        <Button type="submit" size="icon" disabled={running || !question.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
