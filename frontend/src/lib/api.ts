import { parseEventStream } from './sse'
import {
  isNodeName,
  type NodeOutput,
  type ResearchEvent,
  type ResearchRequest,
} from '../types'

const RAW_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
export const API_BASE = RAW_BASE.replace(/\/+$/, '')

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal })
    if (!res.ok) return false
    const body = (await res.json()) as { status?: string }
    return body.status === 'ok'
  } catch {
    return false
  }
}

// Maps a raw SSE frame to a typed event. Returns null for unknown event names
// or malformed JSON so a single bad frame never breaks the stream.
function toResearchEvent(event: string, data: string): ResearchEvent | null {
  let payload: unknown
  try {
    payload = JSON.parse(data)
  } catch {
    return null
  }
  if (typeof payload !== 'object' || payload === null) return null
  const p = payload as Record<string, unknown>

  switch (event) {
    case 'node_start':
      return isNodeName(p.node) ? { type: 'node_start', data: { node: p.node } } : null
    case 'node_end':
      return isNodeName(p.node)
        ? {
            type: 'node_end',
            data: { node: p.node, output: (p.output ?? {}) as NodeOutput },
          }
        : null
    case 'reflect_verdict':
      return {
        type: 'reflect_verdict',
        data: {
          verdict: p.verdict === 'sufficient' ? 'sufficient' : 'needs_more_research',
          reasoning: typeof p.reasoning === 'string' ? p.reasoning : undefined,
          gaps: Array.isArray(p.gaps) ? (p.gaps as string[]) : [],
          follow_up_questions: Array.isArray(p.follow_up_questions)
            ? (p.follow_up_questions as string[])
            : [],
        },
      }
    case 'report_ready':
      return typeof p.final_report === 'string'
        ? { type: 'report_ready', data: { final_report: p.final_report } }
        : null
    case 'error':
      return {
        type: 'error',
        data: { message: typeof p.message === 'string' ? p.message : 'Unknown error' },
      }
    default:
      return null
  }
}

// Streams the research run. Yields typed events. Throws ApiError on a non-OK
// response, or the underlying error (AbortError / network) if the connection
// drops mid-stream — the caller distinguishes those from a backend `error`
// event and from a clean-but-early stream close.
export async function* streamResearch(
  req: ResearchRequest,
  signal: AbortSignal,
): AsyncGenerator<ResearchEvent> {
  const res = await fetch(`${API_BASE}/research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(req),
    signal,
  })

  if (!res.ok) {
    let detail = `The backend rejected the request (HTTP ${res.status}).`
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
      else if (Array.isArray(body.detail)) detail = JSON.stringify(body.detail)
    } catch {
      /* non-JSON error body; keep the generic message */
    }
    throw new ApiError(detail, res.status)
  }

  if (!res.body) throw new ApiError('The backend returned no readable stream.')

  for await (const raw of parseEventStream(res.body)) {
    const evt = toResearchEvent(raw.event, raw.data)
    if (evt) yield evt
  }
}
