import { useEffect, useState } from 'react'

import { API_BASE, checkHealth } from '../lib/api'

interface LandingViewProps {
  onSubmit: (topic: string, maxIterations: number) => void
}

type Health = 'checking' | 'up' | 'down'

const ITERATION_OPTIONS = [1, 2, 3]

export default function LandingView({ onSubmit }: LandingViewProps) {
  const [topic, setTopic] = useState('')
  const [maxIterations, setMaxIterations] = useState(3)
  const [health, setHealth] = useState<Health>('checking')

  useEffect(() => {
    const controller = new AbortController()
    checkHealth(controller.signal).then((ok) => setHealth(ok ? 'up' : 'down'))
    return () => controller.abort()
  }, [])

  const canSubmit = topic.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (canSubmit) onSubmit(topic.trim(), maxIterations)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col justify-center px-5 py-12 sm:py-20">
      <div className="readout mb-4">a sounded research instrument</div>

      <p className="max-w-xl font-body text-lg leading-relaxed text-sounding/90 sm:text-xl">
        Drop a line into a topic. Fathom keeps sounding — searching, reading,
        reflecting — and drops deeper whenever the ground isn&rsquo;t solid yet.
        It stops when it hits bottom, then reports the depth it reached and what
        it found there.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <div>
          <label htmlFor="topic" className="readout">
            topic
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. the current state of solid-state battery commercialization"
            autoFocus
            className="mt-2 w-full rounded-md border border-steel bg-hull px-4 py-3 font-body text-lg text-sounding transition-colors placeholder:text-fog/60 hover:border-fog/70 focus-visible:border-phosphor focus-visible:outline-none"
          />
        </div>

        <fieldset>
          <legend className="readout">Maximum Soundings</legend><br/>
          <p className="mt-1 mb-2 text-sm text-fog">
            How deep the line may drop before it must surface <br/>
          </p>
          <div className="inline-flex rounded-md border border-steel p-1">
            {ITERATION_OPTIONS.map((n) => {
              const selected = n === maxIterations
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMaxIterations(n)}
                  className="rounded px-5 py-2 font-mono text-sm transition-colors focus-visible:outline-2"
                  style={{
                    backgroundColor: selected ? 'var(--color-phosphor)' : 'transparent',
                    color: selected ? 'var(--color-abyss)' : 'var(--color-fog)',
                  }}
                >
                  {n} fm
                </button>
              )
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!canSubmit}
          className="group inline-flex items-center gap-3 rounded-md px-6 py-3 font-display text-base font-medium transition-all focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            backgroundColor: 'var(--color-brass)',
            color: 'var(--color-abyss)',
          }}
        >
          Drop the line
          <span aria-hidden className="font-mono text-lg leading-none">
            ↧
          </span>
        </button>
      </form>

      <div className="mt-10 flex items-center gap-2 font-mono text-xs text-fog">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor:
              health === 'up'
                ? 'var(--color-phosphor)'
                : health === 'down'
                  ? 'var(--color-rust)'
                  : 'var(--color-steel)',
          }}
        />
        {health === 'checking' && 'pinging backend…'}
        {health === 'up' && `backend reachable · ${API_BASE}`}
        {health === 'down' && `backend unreachable · ${API_BASE}`}
      </div>
    </div>
  )
}
