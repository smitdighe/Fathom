<div align="center">

<pre>
███████╗  █████╗  ████████╗ ██╗  ██╗  ██████╗  ███╗   ███╗
██╔════╝ ██╔══██╗ ╚══██╔══╝ ██║  ██║ ██╔═══██╗ ████╗ ████║
█████╗   ███████║    ██║    ███████║ ██║   ██║ ██╔████╔██║
██╔══╝   ██╔══██║    ██║    ██╔══██║ ██║   ██║ ██║╚██╔╝██║
██║      ██║  ██║    ██║    ██║  ██║ ╚██████╔╝ ██║ ╚═╝ ██║
╚═╝      ╚═╝  ╚═╝    ╚═╝    ╚═╝  ╚═╝  ╚═════╝  ╚═╝     ╚═╝
</pre>

### It doesn't stop at the first search result.

</div>

<div align="center">

**Fathom** is an autonomous research agent built on LangGraph. Give it one topic — it plans sub-questions, searches the web, extracts and reads sources, reflects on whether coverage is sufficient, loops back to research more if it isn't, cross-references claims for contradictions, and writes a cited report. No human in the loop after you hit submit.

</div>

---

## 🔍 How It Works

```
topic → Planner (decompose into sub-questions)
      → Search (Tavily, per sub-question)
      → Fetch (httpx + trafilatura, extract page content)
      → Reflect (sufficiency check — LLM verdict)
           ├─ needs_more_research → back to Planner (capped at max_iterations)
           └─ sufficient          → Cross-reference
      → Cross-reference (dedupe claims, flag contradictions, attach sources)
      → Writer (synthesize report, sections cite real source URLs)
      → final report (streamed live via SSE)
```

Every node's output is a validated Pydantic model — no prompt-hacked JSON. The graph is a real state machine (LangGraph `StateGraph`), not a linear script, and the reflect→planner loop is hard-capped (1–3 iterations) so it can't spiral into unbounded cost.

---

## ✨ Features

<table>
  <tr>
    <td align="center" width="220">
      <h3>🔁</h3>
      <b>Self-Correcting Loop</b><br/>
      <sub>Reflects on its own findings and re-plans follow-up sub-questions when coverage is thin</sub><br/>
    </td>
    <td align="center" width="220">
      <h3>📡</h3>
      <b>Live Agent Trace</b><br/>
      <sub>SSE-streamed graph execution — watch each node fire in real time, not just a spinner</sub><br/>
    </td>
    <td align="center" width="220">
      <h3>🧩</h3>
      <b>Structured Everywhere</b><br/>
      <sub>Pydantic v2 schema at every node boundary — planner/reflect/writer can't return malformed output</sub><br/>
    </td>
  </tr>
  <tr>
    <td align="center" width="220">
      <h3>⚖️</h3>
      <b>Contradiction Detection</b><br/>
      <sub>Cross-reference node dedupes claims across sources and flags where they disagree</sub><br/>
    </td>
    <td align="center" width="220">
      <h3>🔗</h3>
      <b>Source-Grounded Citations</b><br/>
      <sub>Report sections cite real, fetched source URLs — never model-invented references</sub><br/>
    </td>
    <td align="center" width="220">
      <h3>📏</h3>
      <b>Depth-Themed UI</b><br/>
      <sub>Live "fathom line" gauge tracks iteration depth as the agent sounds for a sufficient answer</sub><br/>
    </td>
  </tr>
</table>

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| ⚛️ Frontend | React + Vite + TypeScript | Core UI framework and bundler |
| 🎨 Styling | Tailwind CSS | Depth-gauge, live graph trace, reflect log UI |
| 🗄️ Backend | FastAPI (async) + Uvicorn | SSE-streamed API driving the graph |
| 🕸️ Orchestration | LangGraph | Planner → Search → Fetch → Reflect → Cross-reference → Writer state machine |
| 🤖 LLM | Cerebras (`gpt-oss-120b`) | Structured tool-calling at every node |
| 🔎 Search | Tavily API | Per-sub-question web search |
| 📄 Extraction | httpx + trafilatura | Fetch + clean page content from source URLs |
| ✅ Validation | Pydantic v2 | Schema enforcement at every node boundary |
| ☁️ Hosting | Render/Railway/Fly.io (API) + Vercel (Web) | Deployment |

---

## 📁 Project Structure

```bash
Fathom/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py           # POST /research (SSE)
│   │   ├── graph/
│   │   │   ├── state.py            # GraphState + create_initial_state
│   │   │   ├── edges.py            # reflect → planner | cross_reference
│   │   │   ├── build.py            # compiled StateGraph singleton
│   │   │   └── nodes/
│   │   │       ├── planner.py
│   │   │       ├── search.py
│   │   │       ├── fetch.py
│   │   │       ├── reflect.py
│   │   │       ├── cross_reference.py
│   │   │       └── writer.py
│   │   ├── schemas/
│   │   │   ├── planner.py          # PlannerOutput
│   │   │   ├── reflect.py          # ReflectVerdict
│   │   │   ├── source.py           # Source, Claim, Contradiction
│   │   │   └── report.py           # WriterOutput, FinalReport
│   │   ├── services/
│   │   │   ├── llm.py              # Cerebras client, tool-calling helper
│   │   │   ├── search.py           # Tavily wrapper
│   │   │   └── extract.py          # httpx + trafilatura fetch
│   │   ├── streaming/
│   │   │   └── sse.py              # astream_events → SSE event translation
│   │   ├── config.py
│   │   └── main.py
│   ├── tests/
│   ├── .env.example
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingView.tsx
│   │   │   ├── TraceView.tsx
│   │   │   ├── DepthGauge.tsx
│   │   │   ├── NodeGraph.tsx
│   │   │   ├── VerdictPanel.tsx
│   │   │   ├── ReportView.tsx
│   │   │   └── ErrorState.tsx
│   │   ├── useResearch.ts          # SSE consumption hook
│   │   ├── types.ts                # shared SSE payload types
│   │   └── App.tsx
│   ├── .env.example
│   └── vite.config.ts
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

- Python (v3.12 recommended)
- Node.js (v18+ recommended)
- A Cerebras API key ([cloud.cerebras.ai](https://cloud.cerebras.ai))
- A Tavily API key ([app.tavily.com](https://app.tavily.com))

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/fathom.git
cd fathom
```

### 2. Setup Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -e .
```

Create a `.env` file inside `backend/` (use `.env.example` as a reference):

```env
CEREBRAS_API_KEY=your_cerebras_api_key
TAVILY_API_KEY=your_tavily_api_key
DATABASE_URL=
MAX_ITERATIONS=3
ENVIRONMENT=development
```

Then start the backend:

```bash
uvicorn app.main:app --reload
```

> API running at `http://localhost:8000` — Swagger docs at `http://localhost:8000/docs`

### 3. Setup Frontend

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

> Frontend running at `http://localhost:5173`
> ⚠️ Both servers need to be running simultaneously.

---

## 🔌 API

`POST /research`

```json
// request
{ "topic": "string", "max_iterations": 3 }

// response: text/event-stream (SSE)
event: node_start       data: {"node": "planner"}
event: node_end         data: {"node": "planner", "output": {...}}
event: reflect_verdict  data: {"verdict": "sufficient" | "needs_more_research", "reasoning": "string", "gaps": [], "follow_up_questions": []}
event: report_ready     data: {"final_report": "<JSON-encoded FinalReport>"}
event: error            data: {"message": "string"}
```

`GET /health` — liveness check. Interactive docs at `/docs` when running locally.

---

## ⚠️ Known Limitations

- Single topic in, single report out — no multi-turn chat, no follow-up questions after the report
- No persistence — reports aren't saved between runs (v2: Postgres for run history)
- No auth
- Free-tier LLM rate limits (per provider) can interrupt a run mid-loop on longer topics — no automatic provider fallback yet
- Fetch step silently skips sources that block scraping (403s) rather than retrying with alternate methods

---

## 🔮 Future Improvements

- **Persistence:** Postgres-backed run history / past reports dashboard
- **Multi-provider fallback:** automatic failover across LLM providers on rate limit
- **Redis caching:** avoid re-fetching the same URL across reflect loops
- **PDF export:** download the final report as a formatted document
