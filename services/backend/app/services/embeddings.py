import asyncio

from openai import AsyncOpenAI, AuthenticationError
from app.core.config import settings

try:
    from sentence_transformers import SentenceTransformer
    import torch
    _local_model = SentenceTransformer("all-MiniLM-L6-v2")
except ImportError:
    _local_model = None

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

BATCH_SIZE = 100


async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of text strings using OpenAI or a local model."""
    if not settings.OPENAI_API_KEY:
        if _local_model is not None:
            loop = asyncio.get_event_loop()
            embeddings = await loop.run_in_executor(None, _local_model.encode, texts)
            raw = embeddings.tolist() if hasattr(embeddings, 'tolist') else embeddings
            # Pad 384-dim local embeddings to 1536-dim to match database Vector(1536)
            return [vec + [0.0] * (1536 - len(vec)) for vec in raw]
        else:
            return [[0.0] * 1536 for _ in texts]

    # Batch requests to stay within API limits
    all_embeddings: list[list[float]] = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        try:
            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=batch,
            )
        except AuthenticationError:
            raise ValueError(
                "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable."
            )
        all_embeddings.extend(item.embedding for item in response.data)
    return all_embeddings


async def generate_embedding(text: str) -> list[float]:
    """Generate a single embedding."""
    results = await generate_embeddings([text])
    return results[0]
