import type { VerdictEntry } from '../hooks/useResearch'

interface VerdictPanelProps {
  verdicts: VerdictEntry[]
  maxIterations: number
}

export default function VerdictPanel({ verdicts, maxIterations }: VerdictPanelProps) {
  if (verdicts.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="readout">reflect log</div>
      {verdicts.map((v, i) => {
        const last = i === verdicts.length - 1
        const forward = v.routing === 'forward'
        const accent = forward ? 'var(--color-brass)' : 'var(--color-phosphor)'

        return (
          <div
            key={`${v.iteration}-${i}`}
            className={`animate-rise-in rounded-md border bg-hull/60 p-4 ${last ? '' : 'opacity-70'}`}
            style={{
              borderColor: last ? accent : 'var(--color-steel)',
              // Stagger when several cards mount together; capped so a late
              // single append never waits long.
              animationDelay: `${Math.min(i, 4) * 120}ms`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="readout">sounding {v.iteration}</span>
              <span
                className="inline-block font-mono text-xs motion-safe:animate-pop"
                style={{ color: accent }}
              >
                {v.verdict}
              </span>
            </div>

            <p className="mt-2 text-sm font-medium" style={{ color: accent }}>
              {forward
                ? 'Hit solid ground — surfacing the report.'
                : `No bottom yet — dropping to sounding ${Math.min(v.iteration + 1, maxIterations)}.`}
            </p>

            {v.reasoning && (
              <p className="mt-2 text-sm text-fog">{v.reasoning}</p>
            )}

            {v.gaps.length > 0 && (
              <div className="mt-3">
                <div className="readout">gaps</div>
                <ul className="mt-1 space-y-1">
                  {v.gaps.map((g, gi) => (
                    <li key={gi} className="flex gap-2 text-sm text-sounding/85">
                      <span style={{ color: accent }}>·</span>
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {v.follow_up_questions.length > 0 && (
              <div className="mt-3">
                <div className="readout">follow-up questions</div>
                <ul className="mt-1 space-y-1">
                  {v.follow_up_questions.map((q, qi) => (
                    <li key={qi} className="flex gap-2 text-sm text-sounding/85">
                      <span style={{ color: accent }}>·</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
