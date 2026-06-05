import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, History, FolderOpen } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Logo } from '@/components/TopNav.jsx'
import ThemeToggle from '@/components/ThemeToggle.jsx'
import MapView from '@/components/MapView.jsx'
import QueryPanel from '@/components/QueryPanel.jsx'
import HistoryTab from '@/components/HistoryTab.jsx'
import ReportsTab from '@/components/ReportsTab.jsx'
import ReportViewer from '@/components/ReportViewer.jsx'
import { streamQuery, streamReport, resetSession } from '@/api'

const newSessionId = () =>
  crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`

export default function Engine() {
  const [question, setQuestion] = useState('')
  const [running, setRunning] = useState(false)
  const [events, setEvents] = useState([])
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [location, setLocation] = useState(null)
  const [overlays, setOverlays] = useState([])
  const [fires, setFires] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [sessionId, setSessionId] = useState(newSessionId)
  const [lastQueryId, setLastQueryId] = useState(null)

  const [reporting, setReporting] = useState(false)
  const [reportEvents, setReportEvents] = useState([])
  const [viewerId, setViewerId] = useState(null)
  const [tab, setTab] = useState('query')
  const [refreshKey, setRefreshKey] = useState(0)

  // Shared handler: imagery/fires/comparison/location events drive the map.
  const applyMapEvent = (ev) => {
    if (ev.type === 'location') setLocation(ev)
    else if (ev.type === 'imagery') setOverlays((o) => [...o, ev])
    else if (ev.type === 'fires') setFires(ev)
    else if (ev.type === 'comparison') setComparison(ev)
  }

  const onSubmit = useCallback(async () => {
    const q = question.trim()
    if (!q) return
    setRunning(true)
    setError('')
    setEvents((e) => [...e, { type: 'user', text: q }])
    setAnswer('')
    setReportEvents([])

    try {
      await streamQuery(q, sessionId, (ev) => {
        applyMapEvent(ev)
        switch (ev.type) {
          case 'meta':
            setLastQueryId(ev.query_id)
            break
          case 'reasoning':
            // Interim reasoning finalized for this step → persist it and clear
            // the live answer bubble (those streamed tokens were reasoning).
            setEvents((e) => [...e, ev])
            setAnswer('')
            break
          case 'location':
          case 'imagery':
          case 'fires':
          case 'comparison':
          case 'tool_call':
          case 'status':
            setEvents((e) => [...e, ev])
            break
          case 'token':
            setAnswer((a) => a + ev.text)
            break
          case 'answer':
            setEvents((e) => [...e, { type: 'answer', text: ev.text }])
            setAnswer('')
            break
          case 'error':
            setError(ev.message)
            break
          case 'done':
            setRunning(false)
            setRefreshKey((k) => k + 1)
            break
          default:
            break
        }
      })
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setRunning(false)
    }
    setQuestion('')
  }, [question, sessionId])

  const onGenerateReport = useCallback(async () => {
    if (!lastQueryId && events.length === 0) return
    setReporting(true)
    setReportEvents([])
    setError('')
    try {
      await streamReport({ queryId: lastQueryId }, (ev) => {
        applyMapEvent(ev)
        switch (ev.type) {
          case 'tool_call':
          case 'status':
          case 'location':
          case 'imagery':
          case 'fires':
          case 'comparison':
            setReportEvents((e) => [...e, ev])
            break
          case 'report_done':
            setViewerId(ev.report_id)
            setRefreshKey((k) => k + 1)
            break
          case 'error':
            setError(ev.message)
            break
          case 'done':
            setReporting(false)
            setReportEvents([])
            break
          default:
            break
        }
      })
    } catch (err) {
      setError(err.message || 'Report generation failed.')
      setReporting(false)
    }
  }, [lastQueryId, events.length])

  const onReset = useCallback(async () => {
    await resetSession(sessionId).catch(() => {})
    setSessionId(newSessionId())
    setEvents([])
    setAnswer('')
    setError('')
    setLocation(null)
    setOverlays([])
    setFires(null)
    setComparison(null)
    setQuestion('')
    setLastQueryId(null)
    setReportEvents([])
  }, [sessionId])

  const openReport = (id) => setViewerId(id)
  const canReport = events.some((e) => e.type === 'answer')

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <Logo />
        <div className="flex items-center gap-4">
          <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
            How it works
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_minmax(460px,560px)]">
        <div className="relative min-h-[40vh] border-b border-border md:border-b-0 md:border-r">
          <MapView location={location} overlays={overlays} fires={fires} comparison={comparison} />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-col">
          <div className="border-b border-border p-3">
            <TabsList className="w-full">
              <TabsTrigger value="query" className="flex-1">
                <MessageSquare className="size-3.5" /> Query
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                <History className="size-3.5" /> History
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex-1">
                <FolderOpen className="size-3.5" /> Reports
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="query" className="min-h-0 flex-1 data-[state=inactive]:hidden">
            <QueryPanel
              question={question}
              setQuestion={setQuestion}
              onSubmit={onSubmit}
              onReset={onReset}
              onGenerateReport={onGenerateReport}
              running={running}
              reporting={reporting}
              reportEvents={reportEvents}
              events={events}
              answer={answer}
              error={error}
              canReport={canReport}
            />
          </TabsContent>
          <TabsContent value="history" className="min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <HistoryTab refreshKey={refreshKey} onOpenReport={openReport} />
          </TabsContent>
          <TabsContent value="reports" className="min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <ReportsTab refreshKey={refreshKey} onOpenReport={openReport} />
          </TabsContent>
        </Tabs>
      </div>

      <ReportViewer reportId={viewerId} open={!!viewerId} onClose={() => setViewerId(null)} />
    </div>
  )
}
