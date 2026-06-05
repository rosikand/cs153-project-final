import { useEffect, useState } from 'react'
import { FileText, Trash2, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import Transcript from './Transcript.jsx'
import Markdown from './Markdown.jsx'
import { getHistory, getHistoryItem, deleteHistory } from '@/api'

function fmt(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function HistoryTab({ refreshKey, onOpenReport }) {
  const [items, setItems] = useState(null)
  const [detail, setDetail] = useState(null)

  const load = () => getHistory().then(setItems).catch(() => setItems([]))
  useEffect(() => {
    load()
  }, [refreshKey])

  const open = (id) => getHistoryItem(id).then(setDetail).catch(() => {})
  const remove = async (id, e) => {
    e.stopPropagation()
    await deleteHistory(id).catch(() => {})
    load()
  }

  if (items === null)
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    )
  if (items.length === 0)
    return <div className="p-6 text-sm text-muted-foreground">No queries yet. Ask something in the Query tab.</div>

  return (
    <div className="space-y-2 overflow-y-auto p-4">
      {items.map((q) => (
        <div
          key={q.id}
          onClick={() => open(q.id)}
          className="group cursor-pointer rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-[13px] font-medium leading-snug">{q.question}</div>
            <button onClick={(e) => remove(q.id, e)} className="opacity-0 transition-opacity group-hover:opacity-100">
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="size-3" /> {fmt(q.created_at)}
            {q.report_ids?.length > 0 && (
              <Badge variant="default" className="ml-auto">
                <FileText className="size-3" /> {q.report_ids.length} report{q.report_ids.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      ))}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <div className="space-y-4">
              <div className="border-b border-border pb-3 text-sm font-semibold">{detail.question}</div>
              <Transcript events={detail.events || []} />
              {detail.answer && (
                <div className="border-l-2 border-primary pl-3">
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-primary">Analysis</div>
                  <Markdown>{detail.answer}</Markdown>
                </div>
              )}
              {detail.report_ids?.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {detail.report_ids.map((rid) => (
                    <Button key={rid} size="sm" variant="outline" onClick={() => onOpenReport(rid)}>
                      <FileText className="size-4" /> View report
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
