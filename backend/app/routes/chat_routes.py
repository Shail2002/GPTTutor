from fastapi import APIRouter, Depends, HTTPException
from typing import List
import logging
import json
from datetime import datetime
from pathlib import Path
import os

from app.models.schemas import ChatMessage, ChatResponse
from app.models.database import Chat, Material
from app.services.rag import RAGService, PromptService
from app.db import get_db
from sqlalchemy.orm import Session
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize RAG service
rag_service = RAGService()


def _load_material_text(material: Material) -> str:
    """Load the extracted text for a material from disk."""
    text_path = Path(settings.UPLOAD_DIR) / f"{material.id}.txt"
    if text_path.exists():
        return text_path.read_text(encoding="utf-8")

    return ""


def _is_greeting(query: str) -> bool:
    text = query.lower().strip()
    greeting_terms = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"]
    return any(text == term or text.startswith(f"{term} ") for term in greeting_terms)


def _is_out_of_scope(query: str) -> bool:
    text = query.lower()
    fe524_terms = [
        "fe524", "financial engineering", "option", "derivative", "derivatives", "pricing",
        "black-scholes", "black scholes", "volatility", "hedge", "bond", "yield", "risk",
        "portfolio", "stochastic", "monta", "martingale", "binomial", "greek", "delta",
        "gamma", "vega", "theta", "rho", "forward", "futures", "swap", "call", "put",
        "lecture", "pdf", "summary", "flashcard", "quiz", "material", "course",
    ]
    unrelated_terms = [
        "weather", "recipe", "cooking", "movie", "music", "travel", "fitness", "sports",
        "politics", "news", "shopping", "game", "birthday", "joke", "poem", "relationship",
    ]
    if any(term in text for term in unrelated_terms) and not any(term in text for term in fe524_terms):
        return True
    return False


def _general_fe524_reply(query: str) -> str:
    client = rag_service.ensure_openai_client()
    if not client:
        return "Please ask me anything about FE524."

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": PromptService.SYSTEM_PROMPT},
                {"role": "user", "content": PromptService.GENERAL_CHAT_PROMPT_TEMPLATE.format(query=query)},
            ],
            temperature=0.5,
            max_tokens=700,
        )
        return response.choices[0].message.content or "Please ask me anything about FE524."
    except Exception as exc:
        logger.error(f"General FE524 reply failed: {exc}")
        return "Please ask me anything about FE524."


def _save_chat_response(db: Session, query_text: str, answer: str, sources: list[str]) -> ChatResponse:
    chat_record = Chat(
        user_id=None,
        query=query_text,
        response=answer,
        sources=json.dumps(sources),
        created_at=datetime.utcnow(),
    )
    db.add(chat_record)
    db.commit()
    db.refresh(chat_record)

    return ChatResponse(
        id=chat_record.id,
        query=query_text,
        response=answer,
        sources=sources,
        timestamp=chat_record.created_at,
    )


@router.post("")
@router.post("/")
async def chat(request: ChatMessage, db: Session = Depends(get_db)) -> ChatResponse:
    """
    FE524-specific chat with RAG
    Retrieves relevant materials and generates answer
    """
    try:
        query_text = request.query.strip()
        lowered_query = query_text.lower()

        material_ids = request.material_ids or []

        if _is_greeting(query_text):
            answer = (
                "Hi! I’m your FE524 AI tutor. Ask me anything about the course, "
                "and I’ll keep the answer focused on FE524 concepts, formulas, or your uploaded lecture notes."
            )
            return _save_chat_response(db, query_text, answer, [])

        if _is_out_of_scope(query_text):
            answer = "Please ask me anything about FE524. I can help with course concepts, formulas, lecture notes, and exam prep."
            return _save_chat_response(db, query_text, answer, [])

        # Summary-style questions should use the full material text, not just similarity search.
        if any(keyword in lowered_query for keyword in ["summarize", "summary", "summarise"]):
            if not material_ids:
                answer = (
                    "I can summarize your FE524 lecture notes once you attach or select a PDF. "
                    "If you want, ask me a normal FE524 question now and I’ll help right away."
                )
                return _save_chat_response(db, query_text, answer, [])

            material_query = db.query(Material)
            material_query = material_query.filter(Material.id.in_(material_ids))

            materials = material_query.order_by(Material.uploaded_at.desc()).all()
            full_text = "\n\n".join(
                text for material in materials if (text := _load_material_text(material))
            )

            if full_text:
                summary_prompt = PromptService.SUMMARY_PROMPT_TEMPLATE.format(
                    content=full_text[:30000],
                    length="medium",
                    word_limit=200,
                )

                client = rag_service.ensure_openai_client()
                if client:
                    try:
                        summary_response = client.chat.completions.create(
                            model=settings.OPENAI_MODEL,
                            messages=[
                                {"role": "system", "content": PromptService.SYSTEM_PROMPT},
                                {"role": "user", "content": summary_prompt},
                            ],
                            temperature=0.4,
                            max_tokens=1200,
                        )
                        answer = summary_response.choices[0].message.content
                        sources = [material.name for material in materials]

                        chat_record = Chat(
                            user_id=None,
                            query=query_text,
                            response=answer,
                            sources=json.dumps(sources),
                            created_at=datetime.utcnow(),
                        )
                        db.add(chat_record)
                        db.commit()
                        db.refresh(chat_record)

                        return ChatResponse(
                            id=chat_record.id,
                            query=query_text,
                            response=answer,
                            sources=sources,
                            timestamp=chat_record.created_at,
                        )
                    except Exception as summary_error:
                        logger.error(f"Summary generation failed: {summary_error}")

            relevant_chunks = rag_service.retrieve_relevant_chunks(
                query=query_text,
                material_ids=material_ids,
            )

            if relevant_chunks:
                answer, sources = rag_service.generate_answer(
                    query=query_text,
                    relevant_chunks=relevant_chunks,
                )
            else:
                answer = _general_fe524_reply(query_text)
                sources = []
        else:
            answer = _general_fe524_reply(query_text)
            sources = []

        # Save chat to database
        return _save_chat_response(db, query_text, answer, sources)
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_chat_history(limit: int = 50, db: Session = Depends(get_db)) -> List[ChatResponse]:
    """
    Get recent chat history for user
    """
    try:
        # TODO: Filter by user_id from auth context
        chats = db.query(Chat).order_by(Chat.created_at.desc()).limit(limit).all()
        
        return [
            ChatResponse(
                id=chat.id,
                query=chat.query,
                response=chat.response,
                sources=json.loads(chat.sources) if chat.sources else [],
                timestamp=chat.created_at
            )
            for chat in chats
        ]
    except Exception as e:
        logger.error(f"Error retrieving chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
