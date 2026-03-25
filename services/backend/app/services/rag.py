from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.document import DocumentChunk
from app.services.embeddings import generate_embedding

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are DocuChat, an AI assistant that helps users understand their documents.
Answer questions based on the provided document context. Always cite which document and page
your answer comes from. If the context doesn't contain enough information to answer,
say so clearly rather than making something up."""


async def vector_search(db: AsyncSession, query_embedding: list[float], top_k: int = 5) -> list[DocumentChunk]:
    """Find the most relevant document chunks using vector similarity."""
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
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

    if not settings.OPENAI_API_KEY:
        return {
            "answer": "OpenAI API key not configured. Set OPENAI_API_KEY to enable AI responses.",
            "sources": [{"document_id": c.document_id, "page": c.page_number, "preview": c.content[:200]} for c in chunks],
        }

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.2,
        max_tokens=1024,
    )

    return {
        "answer": response.choices[0].message.content,
        "sources": [
            {"document_id": c.document_id, "page": c.page_number, "preview": c.content[:200]}
            for c in chunks
        ],
    }
