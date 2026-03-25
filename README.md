# DocuChat

An AI-powered document assistant that lets you upload PDFs and ask questions about them. Built with a RAG (Retrieval-Augmented Generation) pipeline that chunks documents, generates vector embeddings, and retrieves relevant context to answer questions with source citations.

Works with **OpenAI** or fully offline using **Ollama** with a local model.

## Screenshots

| Chat | Documents |
|------|-----------|
| ![Chat interface](docs/chat.png) | ![Document management](docs/documents.png) |

> To add screenshots, take them from the running app and save to `docs/chat.png` and `docs/documents.png`.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   Backend    │────▶│   PostgreSQL     │
│  React/Vite  │     │   FastAPI    │     │   + pgvector     │
│  port 5173   │     │   port 8000  │     │   port 5432      │
└─────────────┘     └──────┬───────┘     └──────────────────┘
                           │
                    ┌──────┴───────┐
                    │    Ollama    │
                    │  Local LLM   │
                    │  port 11434  │
                    └──────────────┘
```

**How it works:**

1. Upload a PDF → backend extracts text with `pypdf`, splits into overlapping chunks
2. Chunks are embedded (OpenAI `text-embedding-3-small` or local `all-MiniLM-L6-v2`)
3. Embeddings stored in PostgreSQL with pgvector
4. Ask a question → query is embedded, cosine similarity finds the top 5 relevant chunks
5. Chunks + question sent to an LLM (OpenAI `gpt-4o-mini` or Ollama local model)
6. Response streamed back with source citations (document name + page number)

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** FastAPI, SQLAlchemy (async), Python 3.12
- **Database:** PostgreSQL 16 with pgvector for vector similarity search
- **AI:** OpenAI API or Ollama (local, offline-capable)
- **Infrastructure:** Docker Compose

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### Setup

1. **Clone and configure:**

```bash
git clone https://github.com/creedbeats/docuchat.git
cd docuchat
cp .env.example .env
```

2. **Optionally add your OpenAI API key** in `.env`:

```env
OPENAI_API_KEY=sk-...
```

If left empty, the app uses Ollama with a local model (no API key needed).

3. **Start the app:**

```bash
docker compose up --build
```

On first run, Ollama will download the model (~2.3GB for `phi3:mini`). This only happens once.

4. **Open the app:**

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Usage

1. Go to the **Documents** page and upload a PDF
2. Wait for the status to change to "ready" (processing happens in the background)
3. Go to the **Chat** page and ask questions about your documents
4. Responses include source citations with page numbers

## Configuration

All configuration is in the root `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | *(empty)* | OpenAI API key. Leave empty to use Ollama. |
| `OLLAMA_MODEL` | `phi3:mini` | Local model for Ollama. Use `llama3.1:8b` for better quality. |
| `FASTAPI_DEBUG` | `False` | Enable detailed error responses. |

## Project Structure

```
docuchat/
├── docker-compose.yml
├── .env.example
├── services/
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── app/
│   │       ├── main.py              # FastAPI app, startup, CORS
│   │       ├── core/
│   │       │   ├── config.py         # Pydantic settings
│   │       │   └── database.py       # Async SQLAlchemy engine
│   │       ├── models/               # SQLAlchemy models
│   │       ├── api/routes/           # REST endpoints
│   │       └── services/
│   │           ├── document_processor.py  # PDF parsing + chunking
│   │           ├── embeddings.py          # OpenAI / local embeddings
│   │           └── rag.py                 # Vector search + LLM
│   ├── frontend/
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── api/client.ts         # API client
│   │       ├── pages/                # Chat + Documents pages
│   │       └── components/           # Layout
│   └── ollama/
│       ├── Dockerfile
│       └── start.sh                  # Auto-pulls model on startup
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/documents/upload` | Upload a PDF |
| `GET` | `/api/documents/` | List documents (paginated) |
| `DELETE` | `/api/documents/{id}` | Delete a document |
| `GET` | `/api/documents/events` | SSE stream for processing status |
| `POST` | `/api/chat/ask` | Ask a question |
| `GET` | `/api/chat/conversations` | List conversations (paginated) |
| `PATCH` | `/api/chat/conversations/{id}` | Rename a conversation |
| `DELETE` | `/api/chat/conversations/{id}` | Delete a conversation |
| `GET` | `/api/health` | Health check |
