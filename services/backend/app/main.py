from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.database import engine, Base
from app.api.routes import documents, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
        # Create HNSW vector index for fast cosine similarity search
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_chunk_embedding_cosine "
            "ON document_chunks USING hnsw (embedding vector_cosine_ops)"
        ))
    yield


from app.core.config import settings

app = FastAPI(title="DocuChat", version="0.1.0", lifespan=lifespan, debug=settings.FASTAPI_DEBUG)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(chat.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
