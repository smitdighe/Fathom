# Fathom — frontend

The interface for Fathom, a sounded research instrument. It drops a line into a
topic and keeps sounding — searching, reading, reflecting — dropping deeper each
iteration until it hits solid ground (a `sufficient` verdict), then reports the
depth it reached and what it found there.

React + Vite + TypeScript (strict) + Tailwind CSS v4.

## Design in one paragraph

The metaphor is instrumentation, not aquarium — an echo-sounder, not a seascape.

- **Palette** (`src/index.css`): `abyss #0B1A24` canvas (deep water, deliberately
  not pure black), `hull #15272F` panels, `steel #2C4650` etched rules and gauge
  graduations, `fog #8FA6AC` secondary text, `sounding #E9E3D3` warm logbook ink,
  `phosphor #57C4A3` the single live/active accent (green like a sonar CRT),
  `brass #D6A24A` the sounding weight and the "hit bottom" landing, `rust #BF5B4A`
  for terminal errors only.
- **Type**: Space Grotesk (display) / Newsreader (reading serif for report prose)
  / IBM Plex Mono (all instrument data — URLs, depths, counts). Bundled via
  `@fontsource`, no external CDN.
- **Signature element** (`src/components/DepthGauge.tsx`): a graduated vertical
  sounding line. It fills and a brass weight descends as the run iterates, one
  fathom per sounding; the weight lands (one-shot animation) when the verdict is
  sufficient. Depth is derived from real node/iteration events, not decoration.
- **Motion**: only on real state changes (node activating, verdict landing, report
  surfacing). Every keyframe runs once; nothing loops. All of it is gated behind
  `prefers-reduced-motion`. There is no `requestAnimationFrame` or `setInterval`
  anywhere — idle CPU is zero.

## Local development

```bash
npm install
cp .env.example .env      # then edit if your backend isn't on :8000
npm run dev
```

The backend contract is consumed over SSE via `fetch` + a hand-rolled
`ReadableStream` parser (`src/lib/sse.ts`) — native `EventSource` cannot send a
POST body, so it is not used.

## Configuration

Everything routes through a single env var. There is no hardcoded host.

| Variable       | Purpose                        | Example                 |
| -------------- | ------------------------------ | ----------------------- |
| `VITE_API_URL` | Base URL of the Fathom backend | `http://localhost:8000` |

`VITE_API_URL` is inlined **at build time**. A build made for one backend URL will
not silently pick up a different one at runtime — build (or redeploy) after
changing it.

## Production build

```bash
npm run build      # tsc -b && vite build  → dist/
npm run preview    # serves dist/ locally to verify the built output (SSE included)
```

## Deploying to Vercel

1. **Root directory**: set the project's root to `frontend/` (this folder).
2. **Build command**: `npm run build` — **Output directory**: `dist`.
3. **Environment variable**: add `VITE_API_URL` in *Project → Settings →
   Environment Variables*, pointing at your deployed backend
   (e.g. `https://your-backend.example.com`). Because it is inlined at build
   time, **redeploy** after adding or changing it.
4. SPA routing is handled by [`vercel.json`](./vercel.json), which rewrites all
   routes to `index.html`.

### Backend CORS — action required before production

The backend currently sets `allow_origins=["*"]` with `allow_credentials=True`
(`backend/app/main.py`). That is fine for local development, but for production
you should **tighten it to the deployed frontend origin**, e.g.:

```python
allow_origins=["https://your-frontend.vercel.app"]
```

Note: `allow_origins=["*"]` together with `allow_credentials=True` is rejected by
browsers per the CORS spec, so if credentialed requests are ever added this must
change regardless. This frontend sends no cookies/credentials today, so the
wildcard works for now — but pin the origin before going live. *(Flagged only; no
backend files were modified.)*

## Structure

```
src/
  types.ts              typed mirror of the SSE contract
  lib/sse.ts            hand-rolled SSE parser over fetch ReadableStream
  lib/api.ts            VITE_API_URL, /health, streamResearch generator
  hooks/useResearch.ts  reducer-driven state machine consuming the stream
  components/
    LandingView.tsx     topic input, max-soundings selector, health ping
    TraceView.tsx       live graph + gauge + reflect log + error
    DepthGauge.tsx      the sounding-line signature element
    NodeGraph.tsx       planner -> search -> fetch -> reflect -> (loop | cross_reference) -> writer
    VerdictPanel.tsx    reflect verdicts; looping vs. surfacing
    ReportView.tsx      parsed FinalReport with inline citations + source list
    ErrorState.tsx      terminal error, in-voice
```
