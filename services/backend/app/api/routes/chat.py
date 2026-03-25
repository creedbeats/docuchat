from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.conversation import Conversation, Message
from app.services.rag import ask

router = APIRouter(prefix="/api/chat", tags=["chat"])


class AskRequest(BaseModel):
    question: str
    conversation_id: int | None = None


class SourceInfo(BaseModel):
    document_id: int
    page: int | None
    preview: str


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceInfo]
    conversation_id: int


class ConversationResponse(BaseModel):
    id: int
    title: str

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    role: str
    content: str

    model_config = {"from_attributes": True}


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    body: AskRequest,
    db: AsyncSession = Depends(get_db),
):
    if body.conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == body.conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(title=body.question[:100])
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

    # Get conversation history
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    history = [{"role": m.role, "content": m.content} for m in history_result.scalars().all()]

    # Save user message
    db.add(Message(conversation_id=conversation.id, role="user", content=body.question))

    # Get AI response
    result = await ask(db, body.question, conversation_history=history)

    # Save assistant message
    db.add(Message(conversation_id=conversation.id, role="assistant", content=result["answer"]))
    await db.commit()

    return AskResponse(
        answer=result["answer"],
        sources=result["sources"],
        conversation_id=conversation.id,
    )


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).order_by(Conversation.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages_result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    )
    return list(messages_result.scalars().all())
