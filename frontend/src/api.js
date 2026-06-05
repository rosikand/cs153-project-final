// API client for the Parallax backend.

// Parse a fetch SSE stream and dispatch each `data:` frame to onEvent.
async function consumeSSE(resp, onEvent) {
  if (!resp.ok || !resp.body) throw new Error(`Backend error (${resp.status})`)
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const line = frame.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      try {
        onEvent(JSON.parse(line.slice(5).trim()))
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}

export async function streamQuery(question, sessionId, onEvent, signal) {
  const resp = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, session_id: sessionId }),
    signal,
  })
  await consumeSSE(resp, onEvent)
}

export async function streamReport({ queryId, question }, onEvent, signal) {
  const resp = await fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_id: queryId, question }),
    signal,
  })
  await consumeSSE(resp, onEvent)
}

export async function resetSession(sessionId) {
  await fetch('/api/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: '', session_id: sessionId }),
  })
}

const json = (r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))

export const getHistory = () => fetch('/api/history').then(json)
export const getHistoryItem = (id) => fetch(`/api/history/${id}`).then(json)
export const deleteHistory = (id) => fetch(`/api/history/${id}`, { method: 'DELETE' }).then(json)

export const getReports = () => fetch('/api/reports').then(json)
export const getReport = (id) => fetch(`/api/reports/${id}`).then(json)
export const deleteReport = (id) => fetch(`/api/reports/${id}`, { method: 'DELETE' }).then(json)
export const reportPdfUrl = (id) => `/api/reports/${id}/pdf`

export const getHealth = () => fetch('/api/health').then(json)
export const getEval = () => fetch('/api/eval').then(json)
