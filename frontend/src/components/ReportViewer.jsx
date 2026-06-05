import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, FileText, Loader2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getReport, reportPdfUrl } from '@/api'

export default function ReportViewer({ reportId, open, onClose }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !reportId) return
    setLoading(true)
    setReport(null)
    getReport(reportId)
      .then(setReport)
      .catch(() => setReport({ title: 'Report not found', markdown: '' }))
      .finally(() => setLoading(false))
  }, [open, reportId])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="size-4 text-primary" /> Deep Research Report
          </div>
          {reportId && (
            <Button size="sm" variant="outline" asChild>
              <a href={reportPdfUrl(reportId)} target="_blank" rel="noreferrer" download>
                <Download className="size-4" /> PDF
              </a>
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading report…
          </div>
        )}

        {report && (
          <article className="prose-report">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.markdown}</ReactMarkdown>
          </article>
        )}
      </DialogContent>
    </Dialog>
  )
}
