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

        # If no materials specified, retrieve from all
        material_ids = request.material_ids if request.material_ids else None

        # Summary-style questions should use the full material text, not just similarity search.
        if any(keyword in lowered_query for keyword in ["summarize", "summary", "summarise"]):
            material_query = db.query(Material)
            if material_ids:
                material_query = material_query.filter(Material.id.in_(material_ids))

            materials = material_query.order_by(Material.uploaded_at.desc()).all()
            full_text = "\n\n".join(
                text for material in materials if (text := _load_material_text(material))
            )

            if full_text:
                summary_prompt = PromptService.SUMMARY_PROMPT_TEMPLATE.format(
                    content=full_text[:30000],
                    length="medium",
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
        
        # Retrieve relevant chunks from vector DB
        relevant_chunks = rag_service.retrieve_relevant_chunks(
            query=query_text,
            material_ids=material_ids
        )
        
        if not relevant_chunks:
            # Fall back to a broader search across all available materials before giving up.
            if material_ids:
                relevant_chunks = rag_service.retrieve_relevant_chunks(query=query_text)

            if not relevant_chunks:
                answer = "I couldn't find relevant materials to answer this question. Try selecting a different material or upload relevant course materials first."
                sources = []
            else:
                answer, sources = rag_service.generate_answer(
                    query=query_text,
                    relevant_chunks=relevant_chunks
                )
        else:
            # Generate answer using LLM with context
            answer, sources = rag_service.generate_answer(
                query=query_text,
                relevant_chunks=relevant_chunks
            )
        
        # Save chat to database
        chat_record = Chat(
            user_id=None,  # TODO: Get from auth context
            query=query_text,
            response=answer,
            sources=json.dumps(sources),
            created_at=datetime.utcnow()
        )
        
        db.add(chat_record)
        db.commit()
        db.refresh(chat_record)
        
        return ChatResponse(
            id=chat_record.id,
            query=query_text,
            response=answer,
            sources=sources,
            timestamp=chat_record.created_at
        )
    
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
