f# Project Context

## Overview

A full-stack **agentic RAG (Retrieval-Augmented Generation)** application that allows users to upload PDF documents and have intelligent AI-powered conversations about them. The system ingests PDFs into a vector database and uses an autonomous ReAct agent to decide when to search the knowledge base before responding.

## Tech Stack

| Layer       | Technology                                                   |
| ----------- | ------------------------------------------------------------ |
| **Backend** | Node.js, Express.js, LangChain, Ollama (qwen3.6:latest)      |
| **Vector**  | Pinecone (`llama-text-embed-v2` embeddings)                  |
| **Frontend**| React 19, Vite 7, react-markdown                             |
| **Dev**     | ESLint, Prettier, concurrently                               |

## Project Structure

```
agentic-personal-assistant/
├── server/                    # Express API + LangChain agent
│   ├── index.js               # HTTP routes (/api/chat, /api/ingest)
│   ├── agent.js               # ReAct agent with memory (MemorySaver)
│   ├── ingest.js              # PDF pipeline: load → split → embed → upsert
│   ├── tools.js               # Pinecone knowledge base search tool
│   ├── eslint.config.js
│   ├── .prettierrc
│   └── .env.example           # ← actual location (server cwd, not root)
├── client/                    # React chat UI (ChatGPT-like dark theme)
│   ├── src/App.jsx            # Main component: chat + PDF upload panel
│   ├── vite.config.js         # Proxies /api → localhost:3001 (unused, see Gotchas)
│   └── public/                # Static assets
├── package.json               # Root: "npm run dev" starts server + client
└── README.md                  # Full documentation
```

## First-Run Setup

```bash
npm run install:all                          # root + server + client (--legacy-peer-deps)
cp server/.env.example server/.env           # set PINECONE_API_KEY, PINECONE_INDEX
ollama pull qwen3.6:latest && ollama serve   # local LLM — required
npm run dev                                  # server :3001 + client :5173
```

## Key Features

1. **PDF Ingestion** — Upload PDF → text extracted → chunked (1000 chars / 200 overlap) → embedded → stored in Pinecone
2. **Agentic Chat** — ReAct agent with `qwen3.6:latest` autonomously decides whether to call the knowledge base search tool (top 10 results) before answering
3. **Conversation Memory** — Per-session persistence via `MemorySaver` with thread_id
4. **Chat UI** — Dark-themed, Markdown rendering, auto-scroll, loading indicator

## API Endpoints

| Method | Endpoint     | Description                                          |
| ------ | ------------ | ---------------------------------------------------- |
| `POST` | `/api/chat`  | `{ message, sessionId? }` → `{ answer }`             |
| `POST` | `/api/ingest`| `multipart/form-data` (PDF, max 25MB) → `{ ok: true }` |

## Run Commands

```bash
npm run dev          # Both server (:3001) + client (:5173)
npm run dev:server   # Server only
npm run dev:client   # Client only
npm run lint         # ESLint fix + Prettier format
```

## Notable Notes

- LLM runs locally via **Ollama** (not OpenAI despite `server/.env.example` mentioning `OPENAI_API_KEY`)
- No TypeScript — entire codebase is JavaScript (`*.js`, `*.jsx`)
- No test framework present
- Nested `client/client/` directory appears to be a scaffolding artifact

## Gotchas

- **Ollama must be running** before chat works; `runAgent` (server/agent.js:12) fails otherwise.
- **Client bypasses the Vite proxy** — `App.jsx` hardcodes `http://localhost:3001`, so the `/api` proxy in `vite.config.js` is dead code. Port changes must be made in both files.
- **Upload field must be named `file`** — `upload.single("file")` (server/index.js:58); any other key → 400.
- **Embedding model must match** between `ingest.js:17` and `tools.js:27` (`llama-text-embed-v2`). Changing it requires re-ingesting all PDFs.
- **`npm run lint` mutates files** (`eslint --fix` + `prettier --write`). For a read-only check, run `npm run lint` / `npm run format:check` inside `server/` or `client/`.
- **`express-rate-limit` is installed but unused** — no `/api/*` route is rate-limited.
- **Ingestion is sequential batches of 96** chunks (server/ingest.js:22); large PDFs take a while and there is no progress feedback in the UI.
