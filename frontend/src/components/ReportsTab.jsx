import { useEffect, useState } from 'react'
import { FileText, Trash2, Clock, Download, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getReports, deleteReport, reportPdfUrl } from '@/api'

function fmt(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function ReportsTab({ refreshKey, onOpenReport }) {
  const [items, setItems] = useState(null)

  const load = () => getReports().then(setItems).catch(() => setItems([]))
  useEffect(() => {
    load()
  }, [refreshKey])

  const remove = async (id, e) => {
    e.stopPropagation()
    await deleteReport(id).catch(() => {})
    load()
  }

  if (items === null)
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    )
  if (items.length === 0)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No reports yet. Run a query, then “Generate deep-research report”.
      </div>
    )

  return (
    <div className="space-y-2 overflow-y-auto p-4">
      {items.map((r) => (
        <div
          key={r.id}
          onClick={() => onOpenReport(r.id)}
          className="group cursor-pointer rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary"
        >
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="flex-1">
              <div className="text-[13px] font-medium leading-snug">{r.title}</div>
              <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{r.question}</div>
            </div>
            <button onClick={(e) => remove(r.id, e)} className="opacity-0 transition-opacity group-hover:opacity-100">
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="size-3" /> {fmt(r.created_at)}
            <a
              href={reportPdfUrl(r.id)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Download className="size-3" /> PDF
            </a>
            <Badge variant="default">Markdown</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
