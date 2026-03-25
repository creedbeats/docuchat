import asyncio
import logging

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI, AuthenticationError

from app.core.config import settings
from app.models.document import DocumentChunk
from app.services.embeddings import generate_embedding

logger = logging.getLogger(__name__)

LLM_TIMEOUT = 60  # seconds

SYSTEM_PROMPT = """You are DocuChat, an AI assistant that helps users understand their documents.
Answer questions based on the provided document context. Always cite which document and page
your answer comes from. If the context doesn't contain enough information to answer,
say so clearly rather than making something up."""


def _get_llm_client() -> tuple[AsyncOpenAI, str]:
    """Return an (AsyncOpenAI client, model name) using OpenAI if configured, else Ollama."""
    if settings.OPENAI_API_KEY:
        return AsyncOpenAI(api_key=settings.OPENAI_API_KEY), "gpt-4o-mini"
    return (
        AsyncOpenAI(base_url=f"{settings.OLLAMA_URL}/v1", api_key="ollama"),
        settings.OLLAMA_MODEL,
    )


async def vector_search(db: AsyncSession, query_embedding: list[float], top_k: int = 5) -> list[DocumentChunk]:
    """Find the most relevant document chunks using vector similarity."""
    result = await db.execute(
        select(DocumentChunk)
        .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
        .limit(top_k)
    )
    return list(result.scalars().all())


async def ask(db: AsyncSession, question: str, conversation_history: list[dict] | None = None):
    """RAG pipeline: embed query -> vector search -> LLM answer."""
    query_embedding = await generate_embedding(question)
    chunks = await vector_search(db, query_embedding)

    context = "\n\n---\n\n".join(
        f"[Document chunk {c.document_id}, Page {c.page_number}]\n{c.content}"
        for c in chunks
    )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if conversation_history:
        messages.extend(conversation_history)

    messages.append({
        "role": "user",
        "content": f"Context from documents:\n\n{context}\n\nQuestion: {question}",
    })

    client, model = _get_llm_client()

    try:
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.2,
                max_tokens=1024,
            ),
            timeout=LLM_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise ValueError("The AI model took too long to respond. Please try again.")
    except AuthenticationError:
        raise ValueError(
            "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable."
        )

    return {
        "answer": response.choices[0].message.content,
        "sources": [
            {"document_id": c.document_id, "page": c.page_number, "preview": c.content[:200]}
            for c in chunks
        ],
    }
