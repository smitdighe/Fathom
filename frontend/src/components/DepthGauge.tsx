import type { NodeName } from '../types'
import type { Phase } from '../hooks/useResearch'

interface DepthGaugeProps {
  maxIterations: number
  iteration: number
  depth: number
  activeNode: NodeName | null
  landed: boolean
  phase: Phase
}

// Spring-ish overshoot for the descending weight, so depth changes settle with a
// little bounce instead of a linear glide. State-change driven; idle at rest.
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

const NODE_LABEL: Record<NodeName, string> = {
  planner: 'planning',
  search: 'searching',
  fetch: 'fetching',
  reflect: 'reflecting',
  cross_reference: 'cross-referencing',
  writer: 'writing',
}

// The sounding line. A graduated vertical scale (0 at the surface, maxIterations
// fathoms at the floor) with a fill that descends as the run deepens and a brass
// weight that lands when a sufficient verdict is reached. This is the one
// signature element; everything else stays quiet.
export default function DepthGauge({
  maxIterations,
  iteration,
  depth,
  activeNode,
  landed,
  phase,
}: DepthGaugeProps) {
  const fillPct = Math.min((depth / maxIterations) * 100, 100)
  const graduations = Array.from({ length: maxIterations }, (_, i) => i + 1)
  const fillColor = landed ? 'var(--color-brass)' : 'var(--color-phosphor)'

  const statusLine = landed
    ? 'hit bottom'
    : activeNode
      ? NODE_LABEL[activeNode]
      : phase === 'running'
        ? 'sounding'
        : 'idle'

  return (
    <div className="flex h-full min-h-[22rem] gap-3 select-none">
      {/* Scale + track */}
      <div className="relative w-16 shrink-0 sm:w-20">
        {/* Surface marker */}
        <div className="readout absolute -top-1 left-0">0 fm</div>

        {/* The track */}
        <div className="absolute inset-x-0 top-6 bottom-2">
          <div className="relative h-full">
            {/* Etched steel line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-steel" />

            {/* Descended fill */}
            <div
              className="absolute left-3 top-0 w-px origin-top motion-safe:transition-[height] motion-safe:duration-700 motion-safe:ease-out"
              style={{ height: `${fillPct}%`, backgroundColor: fillColor }}
            />

            {/* Graduations (one per sounding / fathom) */}
            {graduations.map((g) => {
              const reached = depth >= g - 0.001
              return (
                <div
                  key={g}
                  className="absolute left-0 flex items-center gap-1.5"
                  style={{ top: `${(g / maxIterations) * 100}%`, transform: 'translateY(-50%)' }}
                >
                  <span
                    className="block h-px w-6 motion-safe:transition-colors motion-safe:duration-500"
                    style={{
                      backgroundColor: reached ? fillColor : 'var(--color-steel)',
                    }}
                  />
                  <span
                    className="font-mono text-[0.625rem] leading-none motion-safe:transition-colors motion-safe:duration-500"
                    style={{ color: reached ? 'var(--color-sounding)' : 'var(--color-fog)' }}
                  >
                    {g}
                  </span>
                </div>
              )
            })}

            {/* Glow trail — a blurred smear that lags the weight on each depth
                change (longer top-transition), fading out along its trailing
                edge via the gradient. Pure transition: it only moves while the
                depth is changing, and rests hidden behind the weight. */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-3 z-0 motion-safe:transition-[top] motion-safe:duration-[1100ms] motion-safe:ease-out"
              style={{ top: `${fillPct}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div
                className="h-9 w-2 -translate-y-2.5 rounded-full opacity-60 blur-md"
                style={{ background: `linear-gradient(to top, ${fillColor}, transparent)` }}
              />
            </div>

            {/* The sounding weight */}
            <div
              className="absolute left-3 z-10 motion-safe:transition-[top] motion-safe:duration-700"
              style={{
                top: `${fillPct}%`,
                transform: 'translate(-50%, -50%)',
                transitionTimingFunction: SPRING,
              }}
            >
              <div
                key={landed ? 'landed' : 'sinking'}
                className={`h-3 w-3 rotate-45 border ${landed ? 'animate-land' : ''}`}
                style={{
                  backgroundColor: fillColor,
                  borderColor: 'var(--color-abyss)',
                  boxShadow: `0 0 10px 1px color-mix(in srgb, ${fillColor} 55%, transparent)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Readout */}
      <div className="flex flex-col justify-between py-6">
        <div>
          <div className="readout">depth</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className="font-mono text-2xl leading-none tabular-nums"
              style={{ color: landed ? 'var(--color-brass)' : 'var(--color-sounding)' }}
            >
              {depth.toFixed(1)}
            </span>
            <span className="font-mono text-xs text-fog">/ {maxIterations} fm</span>
          </div>
        </div>

        <div>
          <div className="readout">sounding</div>
          <div className="mt-1 font-mono text-sm text-sounding">
            {iteration > 0 ? `${iteration} of ${maxIterations}` : '—'}
          </div>
        </div>

        <div>
          <div className="readout">status</div>
          <div
            className="mt-1 font-mono text-sm"
            style={{
              color: landed
                ? 'var(--color-brass)'
                : activeNode
                  ? 'var(--color-phosphor)'
                  : 'var(--color-fog)',
            }}
          >
            {statusLine}
          </div>
        </div>
      </div>
    </div>
  )
}
