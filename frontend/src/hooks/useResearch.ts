import { useCallback, useReducer, useRef } from 'react'

import { ApiError, streamResearch } from '../lib/api'
import {
  NODE_NAMES,
  type FinalReport,
  type NodeName,
  type ReflectVerdictPayload,
  type ResearchEvent,
} from '../types'

export type Phase = 'idle' | 'running' | 'done' | 'error'
export type NodeStatus = 'idle' | 'active' | 'done'
export type ErrorKind = 'backend' | 'network' | 'dropped'

export interface VerdictEntry extends ReflectVerdictPayload {
  iteration: number
  routing: 'looping' | 'forward'
}

export interface NodeVisit {
  key: number
  node: NodeName
  iteration: number
  status: 'active' | 'done'
  detail?: string
}

export interface ResearchState {
  phase: Phase
  topic: string
  maxIterations: number
  iteration: number
  planCount: number
  // Monotonic descent in soundings (fathoms), 0..maxIterations. Advances stage
  // by stage within each sounding so the gauge encodes real progress, not a
  // guess. Driven only by node events; never decreases within a run.
  depth: number
  activeNode: NodeName | null
  nodeStatus: Record<NodeName, NodeStatus>
  visits: NodeVisit[]
  verdicts: VerdictEntry[]
  subQuestions: string[]
  sourceCount: number
  claimCount: number
  contradictionCount: number
  report: FinalReport | null
  error: { message: string; kind: ErrorKind } | null
}

const idleNodeStatus = (): Record<NodeName, NodeStatus> =>
  Object.fromEntries(NODE_NAMES.map((n) => [n, 'idle'])) as Record<
    NodeName,
    NodeStatus
  >

const initialState: ResearchState = {
  phase: 'idle',
  topic: '',
  maxIterations: 3,
  iteration: 0,
  planCount: 0,
  depth: 0,
  activeNode: null,
  nodeStatus: idleNodeStatus(),
  visits: [],
  verdicts: [],
  subQuestions: [],
  sourceCount: 0,
  claimCount: 0,
  contradictionCount: 0,
  report: null,
  error: null,
}

type Action =
  | { kind: 'start'; topic: string; maxIterations: number }
  | { kind: 'event'; event: ResearchEvent }
  | { kind: 'dropped' }
  | { kind: 'fail'; message: string; errorKind: ErrorKind }
  | { kind: 'reset' }

function parseReport(raw: string): FinalReport | null {
  try {
    const obj = JSON.parse(raw) as Partial<FinalReport>
    if (
      typeof obj.title === 'string' &&
      Array.isArray(obj.sections) &&
      Array.isArray(obj.source_list)
    ) {
      return {
        title: obj.title,
        sections: obj.sections,
        source_list: obj.source_list,
        confidence_notes:
          typeof obj.confidence_notes === 'string' ? obj.confidence_notes : '',
      }
    }
  } catch {
    /* fall through */
  }
  return null
}

let visitKey = 0

// Fraction of the current sounding reached when a node starts / ends. reflect's
// end fills the sounding (1.0); cross_reference/writer run post-descent and do
// not deepen it.
const STAGE_START: Partial<Record<NodeName, number>> = {
  planner: 0.05,
  search: 0.45,
  fetch: 0.7,
  reflect: 0.9,
}
const STAGE_END: Partial<Record<NodeName, number>> = {
  planner: 0.3,
  search: 0.55,
  fetch: 0.82,
  reflect: 1.0,
}

function reducer(state: ResearchState, action: Action): ResearchState {
  switch (action.kind) {
    case 'start':
      return {
        ...initialState,
        nodeStatus: idleNodeStatus(),
        phase: 'running',
        topic: action.topic,
        maxIterations: action.maxIterations,
      }

    case 'reset':
      return { ...initialState, nodeStatus: idleNodeStatus() }

    case 'dropped':
      if (state.phase !== 'running') return state
      return {
        ...state,
        phase: 'error',
        activeNode: null,
        error: {
          kind: 'dropped',
          message:
            'The sounding line went slack — the stream closed before a report surfaced.',
        },
      }

    case 'fail':
      return {
        ...state,
        phase: 'error',
        activeNode: null,
        error: { kind: action.errorKind, message: action.message },
      }

    case 'event':
      return applyEvent(state, action.event)
  }
}

function applyEvent(state: ResearchState, event: ResearchEvent): ResearchState {
  switch (event.type) {
    case 'node_start': {
      const node = event.data.node
      const planCount = node === 'planner' ? state.planCount + 1 : state.planCount
      const base = Math.max(planCount - 1, 0)
      const frac = STAGE_START[node]
      const depth =
        frac === undefined ? state.depth : Math.max(state.depth, base + frac)
      return {
        ...state,
        planCount,
        depth,
        activeNode: node,
        nodeStatus: { ...state.nodeStatus, [node]: 'active' },
        visits: [
          ...state.visits,
          { key: visitKey++, node, iteration: state.iteration, status: 'active' },
        ],
      }
    }

    case 'node_end': {
      const { node, output } = event.data
      let next: Partial<ResearchState> = {}
      let detail: string | undefined

      if (node === 'planner') {
        const iteration =
          typeof output.iteration === 'number' ? output.iteration : state.iteration
        const subQuestions = Array.isArray(output.sub_questions)
          ? output.sub_questions
          : state.subQuestions
        next = { iteration, subQuestions }
        detail = `${subQuestions.length} sub-questions · iteration ${iteration}`
      } else if (node === 'fetch') {
        const count = Array.isArray(output.sources)
          ? output.sources.length
          : state.sourceCount
        next = { sourceCount: count }
        detail = `${count} sources retrieved`
      } else if (node === 'cross_reference') {
        const claims = Array.isArray(output.claims)
          ? output.claims.length
          : state.claimCount
        const contradictions = Array.isArray(output.contradictions)
          ? output.contradictions.length
          : state.contradictionCount
        next = { claimCount: claims, contradictionCount: contradictions }
        detail = `${claims} claims · ${contradictions} contradictions`
      } else if (node === 'search') {
        detail = 'query fan-out complete'
      } else if (node === 'reflect') {
        detail = output.verdict ? `verdict: ${output.verdict}` : undefined
      }

      const base = Math.max(state.planCount - 1, 0)
      const frac = STAGE_END[node]
      const depth =
        frac === undefined ? state.depth : Math.max(state.depth, base + frac)

      const visits = markLastVisitDone(state.visits, node, detail)
      return {
        ...state,
        ...next,
        depth,
        activeNode: state.activeNode === node ? null : state.activeNode,
        nodeStatus: { ...state.nodeStatus, [node]: 'done' },
        visits,
      }
    }

    case 'reflect_verdict': {
      const routing =
        event.data.verdict === 'sufficient' ? 'forward' : 'looping'
      return {
        ...state,
        verdicts: [
          ...state.verdicts,
          { ...event.data, iteration: state.iteration, routing },
        ],
      }
    }

    case 'report_ready': {
      const report = parseReport(event.data.final_report)
      if (!report) {
        return {
          ...state,
          phase: 'error',
          activeNode: null,
          error: {
            kind: 'backend',
            message: 'The report surfaced but its payload could not be parsed.',
          },
        }
      }
      return { ...state, phase: 'done', activeNode: null, report }
    }

    case 'error':
      return {
        ...state,
        phase: 'error',
        activeNode: null,
        error: { kind: 'backend', message: event.data.message },
      }
  }
}

function markLastVisitDone(
  visits: NodeVisit[],
  node: NodeName,
  detail: string | undefined,
): NodeVisit[] {
  for (let i = visits.length - 1; i >= 0; i--) {
    const v = visits[i]
    if (v && v.node === node && v.status === 'active') {
      const copy = visits.slice()
      copy[i] = { ...v, status: 'done', detail: detail ?? v.detail }
      return copy
    }
  }
  return visits
}

export function useResearch() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const controllerRef = useRef<AbortController | null>(null)

  const start = useCallback(async (topic: string, maxIterations: number) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    dispatch({ kind: 'start', topic, maxIterations })

    let sawTerminal = false
    try {
      for await (const event of streamResearch(
        { topic, max_iterations: maxIterations },
        controller.signal,
      )) {
        if (event.type === 'error' || event.type === 'report_ready') {
          sawTerminal = true
        }
        dispatch({ kind: 'event', event })
      }
      if (!sawTerminal && !controller.signal.aborted) {
        dispatch({ kind: 'dropped' })
      }
    } catch (err) {
      if (controller.signal.aborted) return // intentional cancel/unmount
      if (err instanceof ApiError) {
        dispatch({ kind: 'fail', message: err.message, errorKind: 'backend' })
      } else {
        dispatch({
          kind: 'fail',
          errorKind: 'network',
          message:
            'Could not reach the backend. Check that it is running and that VITE_API_URL points to it.',
        })
      }
    }
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    dispatch({ kind: 'reset' })
  }, [])

  return { state, start, reset }
}
