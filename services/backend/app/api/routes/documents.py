import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, async_session
from app.models.document import Document, DocumentChunk
from app.services.document_processor import process_document, save_upload
from app.services.embeddings import generate_embeddings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

# In-memory pubsub for document status updates
subscribers: set[asyncio.Queue] = set()


async def notify_subscribers(doc):
    for queue in list(subscribers):
        await queue.put(doc)


class DocumentResponse(BaseModel):
    id: int
    filename: str
    page_count: int
    status: str

    model_config = {"from_attributes": True}


class PaginatedDocuments(BaseModel):
    items: list[DocumentResponse]
    total: int


@router.get("/events")
async def document_events(request: Request, db: AsyncSession = Depends(get_db)):
    """SSE endpoint for real-time document status updates."""
    queue: asyncio.Queue = asyncio.Queue()
    subscribers.add(queue)

    # Only send recent docs on connect instead of the entire table
    result = await db.execute(
        select(Document).order_by(Document.created_at.desc()).limit(50)
    )
    docs = list(result.scalars().all())
    for doc in docs:
        await queue.put(doc)

    async def event_generator():
        try:
            while True:
                try:
                    doc = await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                    if await request.is_disconnected():
                        break
                    continue

                data = DocumentResponse.model_validate(doc).model_dump_json()
                yield f"event: update\ndata: {data}\n\n"
        finally:
            subscribers.discard(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


async def _process_document_background(doc_id: int, file_path: str):
    """Background task: process PDF, generate embeddings, update DB."""
    async with async_session() as db:
        result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalar_one()

        try:
            chunks_data = await asyncio.to_thread(process_document, file_path)
            doc.page_count = max((c["page_number"] for c in chunks_data), default=0)

            texts = [c["content"] for c in chunks_data]
            embeddings = await generate_embeddings(texts)

            for chunk_data, embedding in zip(chunks_data, embeddings):
                chunk = DocumentChunk(
                    document_id=doc.id,
                    chunk_index=chunk_data["chunk_index"],
                    content=chunk_data["content"],
                    page_number=chunk_data["page_number"],
                    embedding=embedding,
                )
                db.add(chunk)

            doc.status = "ready"
            await db.commit()
            await db.refresh(doc)
        except Exception as e:
            logger.exception("Failed to process document %s: %s", doc.filename, e)
            doc.status = "error"
            await db.commit()

        await notify_subscribers(doc)


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_path = await save_upload(file)

    doc = Document(filename=file.filename, file_path=file_path)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Process in background — endpoint returns immediately with status="processing"
    asyncio.create_task(_process_document_background(doc.id, file_path))

    return doc


@router.get("/", response_model=PaginatedDocuments)
async def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    total_result = await db.execute(select(func.count(Document.id)))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(Document).order_by(Document.created_at.desc()).offset(skip).limit(limit)
    )
    items = list(result.scalars().all())
    return PaginatedDocuments(items=items, total=total)


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)
    await db.commit()
