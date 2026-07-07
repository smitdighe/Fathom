// Typed mirror of the backend SSE contract. The wire shapes are exact; node_end
// `output` varies per node so it is modelled loosely and read defensively.

export const NODE_NAMES = [
  'planner',
  'search',
  'fetch',
  'reflect',
  'cross_reference',
  'writer',
] as const

export type NodeName = (typeof NODE_NAMES)[number]

export function isNodeName(v: unknown): v is NodeName {
  return typeof v === 'string' && (NODE_NAMES as readonly string[]).includes(v)
}

// ---- node_end output (loose; only fields we actually read are named) --------

export interface NodeOutput {
  // planner
  sub_questions?: string[]
  iteration?: number
  // fetch
  sources?: SourceRecord[]
  // cross_reference
  claims?: unknown[]
  contradictions?: unknown[]
  // reflect
  verdict?: Verdict
  // writer
  final_report?: string
  [key: string]: unknown
}

export type Verdict = 'sufficient' | 'needs_more_research'

// ---- report_ready → final_report (JSON string) ------------------------------

export interface ReportSection {
  heading: string
  content: string
  citations: string[]
}

export interface SourceRecord {
  url: string
  title: string
  content: string
  retrieved_at: string
  sub_question: string
}

export interface FinalReport {
  title: string
  sections: ReportSection[]
  source_list: SourceRecord[]
  confidence_notes: string
}

// ---- SSE event payloads -----------------------------------------------------

export interface NodeStartPayload {
  node: NodeName
}

export interface NodeEndPayload {
  node: NodeName
  output: NodeOutput
}

// The live backend forwards {verdict, gaps, follow_up_questions}. `reasoning`
// is stripped server-side, so it is optional here and rendered only if present.
export interface ReflectVerdictPayload {
  verdict: Verdict
  reasoning?: string
  gaps: string[]
  follow_up_questions: string[]
}

export interface ReportReadyPayload {
  final_report: string
}

export interface ErrorPayload {
  message: string
}

// Discriminated union of everything the stream can emit.
export type ResearchEvent =
  | { type: 'node_start'; data: NodeStartPayload }
  | { type: 'node_end'; data: NodeEndPayload }
  | { type: 'reflect_verdict'; data: ReflectVerdictPayload }
  | { type: 'report_ready'; data: ReportReadyPayload }
  | { type: 'error'; data: ErrorPayload }

// ---- request ----------------------------------------------------------------

export interface ResearchRequest {
  topic: string
  max_iterations: number
}
