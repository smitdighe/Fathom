import type { FinalReport, SourceRecord } from '../types'
import type { ResearchState } from '../hooks/useResearch'

interface ReportViewProps {
  state: ResearchState
  report: FinalReport
  onReset: () => void
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

export default function ReportView({ state, report, onReset }: ReportViewProps) {
  const index = new Map<string, number>()
  report.source_list.forEach((s, i) => index.set(s.url, i + 1))

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-10">
      {/* Depth summary */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-steel pb-6">
        <div>
          <div className="readout">depth reached</div>
          <div className="mt-1 font-mono text-xl" style={{ color: 'var(--color-brass)' }}>
            {state.depth.toFixed(1)} / {state.maxIterations} fm
          </div>
        </div>
        <div>
          <div className="readout">soundings taken</div>
          <div className="mt-1 font-mono text-xl text-sounding">{state.iteration}</div>
        </div>
        <div>
          <div className="readout">sources</div>
          <div className="mt-1 font-mono text-xl text-sounding">
            {report.source_list.length}
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="ml-auto rounded border border-steel bg-hull-2 px-4 py-2 text-sm text-sounding transition-colors hover:border-sounding/50 focus-visible:outline-2"
        >
          New sounding
        </button>
      </div>

      <h1 className="animate-rise text-3xl leading-tight text-sounding sm:text-4xl">
        {report.title}
      </h1>

      {report.sections.map((section, i) => (
        <section key={i} className="mt-8">
          <h2 className="text-xl text-sounding sm:text-2xl">{section.heading}</h2>
          <p className="mt-3 whitespace-pre-line font-body text-lg leading-relaxed text-sounding/90">
            {section.content}
          </p>

          {section.citations.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="readout">cited</span>
              {section.citations.map((url, ci) => {
                const n = index.get(url)
                return n ? (
                  <a
                    key={ci}
                    href={`#source-${n}`}
                    className="rounded border border-steel px-2 py-0.5 font-mono text-xs text-phosphor transition-colors hover:border-phosphor focus-visible:outline-2"
                  >
                    [{n}]
                  </a>
                ) : (
                  <a
                    key={ci}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded border border-steel px-2 py-0.5 font-mono text-xs text-fog transition-colors hover:border-phosphor focus-visible:outline-2"
                  >
                    {hostOf(url)}
                  </a>
                )
              })}
            </div>
          )}
        </section>
      ))}

      {report.confidence_notes && (
        <section
          className="mt-10 rounded-md border p-5"
          style={{
            borderColor: 'var(--color-brass)',
            backgroundColor: 'color-mix(in srgb, var(--color-brass) 7%, var(--color-hull))',
          }}
        >
          <div className="readout" style={{ color: 'var(--color-brass)' }}>
            confidence notes
          </div>
          <p className="mt-2 whitespace-pre-line font-body text-base leading-relaxed text-sounding/90">
            {report.confidence_notes}
          </p>
        </section>
      )}

      <SourceList sources={report.source_list} formatTime={formatTime} hostOf={hostOf} />
    </article>
  )
}

function SourceList({
  sources,
  formatTime,
  hostOf,
}: {
  sources: SourceRecord[]
  formatTime: (iso: string) => string
  hostOf: (url: string) => string
}) {
  if (sources.length === 0) return null
  return (
    <section className="mt-12 border-t border-steel pt-6">
      <h2 className="readout mb-4">source list</h2>
      <ol className="space-y-4">
        {sources.map((s, i) => (
          <li
            key={i}
            id={`source-${i + 1}`}
            className="scroll-mt-6 border-l-2 border-steel pl-4"
          >
            <div className="flex gap-2">
              <span className="font-mono text-xs text-brass">[{i + 1}]</span>
              <div className="min-w-0">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-body text-base text-sounding underline decoration-steel underline-offset-2 transition-colors hover:decoration-phosphor focus-visible:outline-2"
                >
                  {s.title || hostOf(s.url)}
                </a>
                <div className="mt-1 truncate font-mono text-xs text-phosphor/80">
                  {s.url}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.7rem] text-fog">
                  <span>retrieved {formatTime(s.retrieved_at)}</span>
                  {s.sub_question && <span>· asked: {s.sub_question}</span>}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
