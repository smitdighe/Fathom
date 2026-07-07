import type { NodeName } from '../types'
import type { NodeStatus, ResearchState } from '../hooks/useResearch'

interface Station {
  node: NodeName
  label: string
  note: string
}

const STATIONS: Station[] = [
  { node: 'planner', label: 'Planner', note: 'decompose the topic' },
  { node: 'search', label: 'Search', note: 'query fan-out' },
  { node: 'fetch', label: 'Fetch', note: 'retrieve + extract' },
  { node: 'reflect', label: 'Reflect', note: 'sufficiency check' },
  { node: 'cross_reference', label: 'Cross-reference', note: 'claims + contradictions' },
  { node: 'writer', label: 'Writer', note: 'synthesize the report' },
]

function detailFor(node: NodeName, s: ResearchState): string | null {
  switch (node) {
    case 'planner':
      return s.subQuestions.length ? `${s.subQuestions.length} sub-questions` : null
    case 'fetch':
      return s.sourceCount ? `${s.sourceCount} sources` : null
    case 'cross_reference':
      return s.claimCount || s.contradictionCount
        ? `${s.claimCount} claims · ${s.contradictionCount} contradictions`
        : null
    default:
      return null
  }
}

function dotStyle(status: NodeStatus): React.CSSProperties {
  if (status === 'active')
    return {
      backgroundColor: 'var(--color-phosphor)',
      boxShadow: '0 0 0 4px color-mix(in srgb, var(--color-phosphor) 22%, transparent)',
    }
  if (status === 'done') return { backgroundColor: 'var(--color-steel)' }
  return { backgroundColor: 'transparent', border: '1px solid var(--color-steel)' }
}

export default function NodeGraph({ state }: { state: ResearchState }) {
  const latest = state.verdicts.at(-1)
  const looping = latest?.routing === 'looping'

  return (
    <ol className="relative">
      {STATIONS.map((station, i) => {
        const status = state.nodeStatus[station.node]
        const active = status === 'active'
        const done = status === 'done'
        const detail = detailFor(station.node, state)
        const isReflect = station.node === 'reflect'
        const last = i === STATIONS.length - 1

        return (
          <li key={station.node} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector rail */}
            {!last && (
              <span
                className="absolute left-[7px] top-5 h-full w-px motion-safe:transition-colors motion-safe:duration-500"
                style={{
                  backgroundColor: done ? 'var(--color-steel)' : 'var(--color-hull-2)',
                }}
              />
            )}

            {/* Station dot */}
            <span className="relative z-10 mt-1 block h-3.5 w-3.5 shrink-0">
              {/* Single-shot pulse ring, fires once when the node goes LIVE
                  (mounts on the idle/done -> active transition) and holds. */}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full motion-safe:animate-pulse-ring"
                  style={{ border: '1.5px solid var(--color-phosphor)' }}
                />
              )}
              <span
                className="block h-full w-full rounded-full motion-safe:transition-all motion-safe:duration-300"
                style={dotStyle(status)}
              />
              {/* On completion the indicator morphs into a checkmark that
                  scales in — mounts on node_end, plays once. */}
              {done && (
                <svg
                  aria-hidden
                  viewBox="0 0 14 14"
                  className="absolute inset-0 h-full w-full motion-safe:animate-check"
                >
                  <path
                    d="M3 7.4 6 10.2 11 4"
                    fill="none"
                    stroke="var(--color-phosphor)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3
                  className="text-base motion-safe:transition-colors motion-safe:duration-300"
                  style={{
                    color: active
                      ? 'var(--color-phosphor)'
                      : done
                        ? 'var(--color-sounding)'
                        : 'var(--color-fog)',
                  }}
                >
                  {station.label}
                </h3>
                {active && (
                  <span className="readout" style={{ color: 'var(--color-phosphor)' }}>
                    live
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-sm text-fog">{station.note}</p>

              {detail && (
                <p className="mt-1 font-mono text-xs text-sounding/80">{detail}</p>
              )}

              {/* Branch indicator after reflect */}
              {isReflect && latest && (
                <div
                  className="mt-2 inline-flex items-center gap-2 rounded border px-2 py-1 font-mono text-[0.7rem]"
                  style={{
                    borderColor: looping ? 'var(--color-phosphor)' : 'var(--color-brass)',
                    color: looping ? 'var(--color-phosphor)' : 'var(--color-brass)',
                  }}
                >
                  {looping
                    ? `loops to planner · sounding ${latest.iteration + 1}`
                    : 'advances to cross-reference'}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
