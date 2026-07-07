import DepthGauge from './DepthGauge'
import ErrorState from './ErrorState'
import NodeGraph from './NodeGraph'
import VerdictPanel from './VerdictPanel'
import type { ResearchState } from '../hooks/useResearch'

interface TraceViewProps {
  state: ResearchState
  onReset: () => void
}

export default function TraceView({ state, onReset }: TraceViewProps) {
  const landed =
    state.phase === 'done' || state.verdicts.at(-1)?.routing === 'forward'

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      <header className="mb-8">
        <div className="readout">now sounding</div>
        <h1 className="mt-1 max-w-3xl text-2xl leading-tight text-sounding sm:text-3xl">
          {state.topic}
        </h1>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        {/* Signature: the sounding line */}
        <div className="lg:sticky lg:top-6 lg:h-fit lg:w-60 lg:shrink-0">
          <div className="rounded-lg border border-steel bg-hull/50 p-5">
            <DepthGauge
              maxIterations={state.maxIterations}
              iteration={state.iteration}
              depth={state.depth}
              activeNode={state.activeNode}
              landed={landed}
              phase={state.phase}
            />
          </div>
        </div>

        {/* Trace + reflection */}
        <div className="min-w-0 flex-1 space-y-8">
          <section
            aria-label="Research graph"
            className="rounded-lg border border-steel bg-hull/50 p-5 sm:p-6"
          >
            <div className="readout mb-5">graph trace</div>
            <NodeGraph state={state} />
          </section>

          {state.verdicts.length > 0 && (
            <section aria-label="Reflection log">
              <VerdictPanel
                verdicts={state.verdicts}
                maxIterations={state.maxIterations}
              />
            </section>
          )}

          {state.phase === 'error' && state.error && (
            <ErrorState
              kind={state.error.kind}
              message={state.error.message}
              onReset={onReset}
            />
          )}
        </div>
      </div>
    </div>
  )
}
