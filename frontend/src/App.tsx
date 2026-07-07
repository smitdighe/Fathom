import LandingView from './components/LandingView'
import ReportView from './components/ReportView'
import TraceView from './components/TraceView'
import { useResearch } from './hooks/useResearch'

export default function App() {
  const { state, start, reset } = useResearch()
  const onLanding = state.phase === 'idle'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-steel/60 bg-abyss/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2.5 focus-visible:outline-2"
            aria-label="Fathom — start over"
          >
            <Mark />
            <span className="font-display text-lg font-medium tracking-tight text-sounding">
              Fathom
            </span>
          </button>
          {!onLanding && (
            <button
              type="button"
              onClick={reset}
              className="rounded border border-steel px-3 py-1.5 font-mono text-xs text-fog transition-colors hover:border-sounding/50 hover:text-sounding focus-visible:outline-2"
            >
              New sounding
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {onLanding && <LandingView onSubmit={start} />}
        {(state.phase === 'running' || state.phase === 'error') && (
          <TraceView state={state} onReset={reset} />
        )}
        {state.phase === 'done' && state.report && (
          <ReportView state={state} report={state.report} onReset={reset} />
        )}
      </main>

      <footer className="border-t border-steel/60 px-5 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between font-mono text-[0.7rem] text-fog">
          <span>fathom · sounded research</span>
          <span aria-hidden>1 fathom = 6 feet</span>
        </div>
      </footer>
    </div>
  )
}

// Wordmark glyph: a sounding line with a brass weight. Instrument, not icon.
function Mark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none">
      <line x1="10" y1="1" x2="10" y2="19" stroke="var(--color-steel)" strokeWidth="1.5" />
      <line x1="5" y1="4" x2="10" y2="4" stroke="var(--color-phosphor)" strokeWidth="1.5" />
      <line x1="5" y1="9" x2="10" y2="9" stroke="var(--color-phosphor)" strokeWidth="1.5" />
      <line x1="5" y1="14" x2="10" y2="14" stroke="var(--color-phosphor)" strokeWidth="1.5" />
      <rect x="8" y="16" width="4" height="3" rx="0.5" fill="var(--color-brass)" />
    </svg>
  )
}
