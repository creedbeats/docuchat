from openai import AsyncOpenAI

from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of text strings using OpenAI."""
    if not settings.OPENAI_API_KEY:
        # Return zero vectors when no API key is configured (dev mode)
        return [[0.0] * 1536 for _ in texts]

    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    return [item.embedding for item in response.data]


async def generate_embedding(text: str) -> list[float]:
    """Generate a single embedding."""
    results = await generate_embeddings([text])
    return results[0]
