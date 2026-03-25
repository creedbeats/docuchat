from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.document import Document, DocumentChunk
from app.services.document_processor import process_document, save_upload
from app.services.embeddings import generate_embeddings

router = APIRouter(prefix="/api/documents", tags=["documents"])


class DocumentResponse(BaseModel):
    id: int
    filename: str
    page_count: int
    status: str

    model_config = {"from_attributes": True}


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    file_path = save_upload(file.filename, content)

    doc = Document(filename=file.filename, file_path=file_path)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    try:
        chunks_data = process_document(file_path)
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
    except Exception:
        doc.status = "error"
        await db.commit()
        raise HTTPException(status_code=500, detail="Failed to process document")

    return doc


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


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
