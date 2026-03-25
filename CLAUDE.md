# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DocuChat is an AI-powered PDF document assistant using RAG (Retrieval-Augmented Generation). Users upload PDFs, which are parsed, chunked, and embedded into vectors. Users then ask questions and get LLM-generated answers with source citations.

## Architecture

Three Docker Compose services:
- **Frontend** (port 5173): React 19 + TypeScript + Vite
- **Backend** (port 8000): FastAPI + Python 3.12 + SQLAlchemy (async)
- **Database** (port 5432): PostgreSQL with pgvector extension

## Build & Run Commands

```bash
# Start all services
docker compose up --build

# Start specific service
docker compose up backend
docker compose up frontend

# Backend logs
docker compose logs -f backend

# Frontend only (local dev without Docker)
cd services/frontend && npm install && npm run dev

# Frontend build
cd services/frontend && npm run build
```

No test framework is configured yet.

## Key Data Flow

1. PDF uploaded → `document_processor.py` extracts text via pypdf, chunks it (size=1000, overlap=200)
2. Chunks embedded via OpenAI `text-embedding-3-small` (falls back to local SentenceTransformer if no API key)
3. Embeddings stored in PostgreSQL using pgvector
4. On question: query embedded → cosine similarity search returns top 5 chunks → chunks fed as context to `gpt-4o-mini` → response with source citations

## Backend Structure (`services/backend/app/`)

- `main.py` — FastAPI app with CORS, router registration, DB table auto-creation
- `core/config.py` — Pydantic settings (env vars: `DATABASE_URL`, `OPENAI_API_KEY`, `UPLOAD_DIR`)
- `core/database.py` — Async SQLAlchemy engine + session factory
- `models/` — SQLAlchemy models: `Document`, `DocumentChunk` (with vector column), `Conversation`, `Message`
- `services/embeddings.py` — Embedding generation (OpenAI or local)
- `services/document_processor.py` — PDF parsing and chunking
- `services/rag.py` — Vector search + LLM prompt construction
- `api/routes/documents.py` — Upload, list, delete endpoints + SSE status stream
- `api/routes/chat.py` — Question answering + conversation management

## Frontend Structure (`services/frontend/src/`)

- `api/client.ts` — All backend API calls (upload, list, delete, ask, conversations)
- `pages/DocumentsPage.tsx` — PDF upload UI with real-time status via SSE (EventSource)
- `pages/ChatPage.tsx` — Chat interface with source citations and conversation history

## Environment Setup

Required env vars (see `.env.example` and `services/backend/.env.example`):
- `OPENAI_API_KEY` — needed for LLM responses; embedding falls back to local model without it
- `DATABASE_URL` — defaults to `postgresql+asyncpg://docuchat:docuchat_dev@db:5432/docuchat`
- `VITE_API_URL` — frontend API base URL, defaults to `http://localhost:8000`

## API Endpoints

- `POST /api/documents/upload` — Upload PDF
- `GET /api/documents/` — List documents
- `DELETE /api/documents/{id}` — Delete document
- `GET /api/documents/events` — SSE stream for processing status
- `POST /api/chat/ask` — Ask question (body: `question`, optional `conversation_id`)
- `GET /api/chat/conversations` — List conversations
- `GET /api/chat/conversations/{id}/messages` — Get messages
- `GET /api/health` — Health check
