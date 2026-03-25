# GovStar — AI-Powered Government Document Assistant

A full-stack app where users upload government documents (PDFs, memos, reports), and an LLM-powered backend indexes, summarizes, and answers questions about them. Think "ChatGPT for your agency's document library."

---

## Why this project hits the JD

| JD Requirement | How GovStar covers it |
|---|---|
| Full-stack Python + React | FastAPI backend, React/TypeScript frontend |
| AI/LLM integration | Document Q&A via OpenAI-compatible API |
| PostgreSQL + NoSQL | Postgres for metadata, pgvector for embeddings |
| Cloud-ready (Azure) | Dockerized, easy to deploy to Azure App Service |
| Document Intelligence | PDF parsing, chunking, vector search |
| Prompt engineering | RAG pipeline with custom prompts |
| APIs & backend services | REST API with auth, file upload, async processing |

---

## Architecture

```
┌─────────────────┐       ┌─────────────────────┐       ┌──────────────┐
│  React Frontend │──────▶│  FastAPI Backend     │──────▶│  PostgreSQL  │
│  (TypeScript)   │  API  │  - Auth              │       │  + pgvector  │
│  - Upload docs  │◀──────│  - Doc processing    │       └──────────────┘
│  - Chat UI      │       │  - RAG Q&A pipeline  │
│  - Doc browser  │       │  - Embeddings        │
└─────────────────┘       └─────────────────────┘
        All services run in Docker Compose
```

---

## Phase 1 — Foundation (Week 1)

- **Docker Compose** setup: Postgres + FastAPI + React dev server
- **Database schema**: users, documents, document_chunks (with pgvector embeddings)
- **FastAPI skeleton**: health check, CORS, project structure
- **React scaffold**: Vite + TypeScript, router, basic layout

## Phase 2 — Document Pipeline (Week 2)

- **File upload API** (PDF support)
- **PDF parsing** → text extraction → chunking
- **Embedding generation** (OpenAI API or local model)
- **Store chunks + vectors** in Postgres/pgvector
- **Document list UI** in React

## Phase 3 — AI Chat / Q&A (Week 3)

- **RAG endpoint**: query → vector search → LLM prompt → answer
- **Chat UI component** in React with streaming responses
- **Prompt templates** with source citation
- **Conversation history** stored in Postgres

## Phase 4 — Polish (Week 4)

- **Auth** (JWT-based login)
- **Document viewer** with highlighted source passages
- Basic **error handling, loading states, tests**
- README with setup + deployment instructions

---

## Tech Stack Summary

| Layer | Tech |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | PostgreSQL + pgvector extension |
| AI | OpenAI API (or Azure OpenAI), LangChain (light use) |
| Infra | Docker, Docker Compose |
| Auth | JWT via python-jose |

---

## File Structure

```
govstar/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py
│   │   ├── api/routes/
│   │   ├── models/
│   │   ├── services/  (doc processing, embeddings, rag)
│   │   └── core/      (config, auth, db)
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── api/
│   └── package.json
└── README.md
```
