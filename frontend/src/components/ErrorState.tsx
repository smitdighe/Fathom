import type { ErrorKind } from '../hooks/useResearch'

interface ErrorStateProps {
  kind: ErrorKind
  message: string
  onReset: () => void
}

const HEADING: Record<ErrorKind, string> = {
  backend: 'The run struck an error.',
  network: 'The backend is out of range.',
  dropped: 'The line went slack.',
}

export default function ErrorState({ kind, message, onReset }: ErrorStateProps) {
  return (
    <div
      className="animate-rise rounded-md border p-5"
      style={{
        borderColor: 'var(--color-rust)',
        backgroundColor: 'color-mix(in srgb, var(--color-rust) 8%, var(--color-hull))',
      }}
      role="alert"
    >
      <div className="readout" style={{ color: 'var(--color-rust)' }}>
        terminal state
      </div>
      <h2 className="mt-2 text-xl" style={{ color: 'var(--color-sounding)' }}>
        {HEADING[kind]}
      </h2>
      <p className="mt-2 max-w-prose font-mono text-sm text-fog">{message}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded border border-steel bg-hull-2 px-4 py-2 text-sm text-sounding transition-colors hover:border-sounding/50 focus-visible:outline-2"
      >
        New sounding
      </button>
    </div>
  )
}
