from fastapi import APIRouter, Depends, HTTPException
from typing import List
import logging
import json
import re
from datetime import datetime
from pathlib import Path

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
    normalized = re.sub(r"[^a-z\s]", " ", query.lower()).strip()
    normalized = re.sub(r"\s+", " ", normalized)
    greeting_terms = {"hi", "hello", "hey", "good morning", "good afternoon", "good evening"}
    return normalized in greeting_terms


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


def _material_role(material_name: str) -> str:
    name = material_name.lower()
    if re.search(r"(^|[^a-z0-9])hw\s*0?\d+", name) or "homework" in name or "assignment" in name:
        return "assignment prompt"
    if re.search(r"(^|[^a-z0-9])w\s*0?\d+", name) or "lecture" in name or "slides" in name or "ppt" in name:
        return "lecture notes"
    if "solution" in name:
        return "student/proposed solution"
    return "course material"


def _mentions_material_context(query: str) -> bool:
    text = query.lower()
    material_terms = [
        "according to", "based on", "from the pdf", "from pdf", "in the pdf", "the pdf",
        "uploaded", "material", "materials", "lecture", "lectures", "notes", "slides",
        "ppt", "powerpoint", "document", "homework prompt", "selected homework", "selected pdf",
        "week 12", "week12", "homework 12", "hw12", "homework 4", "hw04", "hw4",
        "w05", "w08", "hw03", "w12",
    ]
    return any(term in text for term in material_terms)


def _is_homework_like(query: str) -> bool:
    text = query.lower()
    homework_terms = [
        "homework", "assignment", "problem", "solve", "calculate", "derive", "show that",
        "prove", "question", "exercise", "step by step", "steps", "hint", "how do i",
        "walk me through", "guide me", "help me solve",
    ]
    return any(term in text for term in homework_terms)


def _answer_mode(query: str) -> str:
    text = query.lower()
    review_terms = [
        "is it correct", "is this correct", "is my solution correct", "check this",
        "review this", "verify this", "does this solve", "will this work",
        "is it right", "is this right",
    ]
    if any(term in text for term in review_terms):
        return "review"
    assignment_terms = [
        "homework", "assignment", "hw", "deliverable", "submission", "canvas",
        "requirements", "solution", "script", "requirements file", "screenshot",
        "mcp server", "agent",
    ]
    if any(term in text for term in assignment_terms):
        return "assignment"
    if _is_homework_like(query):
        return "homework"
    return "normal"


def _tokens(text: str) -> set[str]:
    stop_words = {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i",
        "in", "is", "it", "of", "on", "or", "please", "solve", "that", "the", "this",
        "to", "what", "with", "you",
    }
    return {
        token
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9_\-]{2,}", text.lower())
        if token not in stop_words
    }


def _retrieve_text_chunks_from_materials(
    db: Session,
    query: str,
    material_ids: list[str],
    top_k: int = 5,
) -> list[dict]:
    """Fallback retriever that uses extracted text files when Chroma is unavailable."""
    material_query = db.query(Material)
    if material_ids:
        material_query = material_query.filter(Material.id.in_(material_ids))

    materials = material_query.order_by(Material.uploaded_at.desc()).all()
    query_tokens = _tokens(query)
    if not materials or not query_tokens:
        return []

    ranked_chunks: list[dict] = []
    for material in materials:
        text = _load_material_text(material)
        if not text:
            continue

        for idx, chunk in enumerate(rag_service.chunk_document(text, chunk_size=450, overlap=80)):
            chunk_tokens = _tokens(chunk)
            overlap = len(query_tokens.intersection(chunk_tokens))
            if overlap == 0:
                continue

            ranked_chunks.append({
                "chunk": chunk,
                "material_id": material.id,
                "material_name": material.name,
                "material_role": _material_role(material.name),
                "score": overlap / max(len(query_tokens), 1),
                "chunk_idx": idx,
            })

    ranked_chunks.sort(key=lambda item: item["score"], reverse=True)
    return ranked_chunks[:top_k]


def _assignment_overview_chunks(
    db: Session,
    material_ids: list[str],
    top_k: int = 6,
) -> list[dict]:
    """Return opening chunks from assignment materials so requirements are not missed."""
    material_query = db.query(Material)
    if material_ids:
        material_query = material_query.filter(Material.id.in_(material_ids))

    materials = material_query.order_by(Material.uploaded_at.desc()).limit(5).all()
    chunks: list[dict] = []
    for material in materials:
        text = _load_material_text(material)
        if not text:
            continue

        for idx, chunk in enumerate(rag_service.chunk_document(text, chunk_size=550, overlap=80)[:2]):
            chunks.append({
                "chunk": chunk,
                "material_id": material.id,
                "material_name": material.name,
                "material_role": _material_role(material.name),
                "score": 1.0 if idx == 0 else 0.8,
                "chunk_idx": idx,
            })
            if len(chunks) >= top_k:
                return chunks

    return chunks


def _source_briefing(chunks: list[dict]) -> str:
    if not chunks:
        return ""

    roles: dict[str, list[str]] = {}
    for chunk in chunks:
        role = chunk.get("material_role", "course material")
        name = chunk.get("material_name", "unknown")
        if name not in roles.setdefault(role, []):
            roles[role].append(name)

    lines = ["Source map for tutor reasoning:"]
    for role, names in roles.items():
        lines.append(f"- {role}: {', '.join(names)}")
    lines.append(
        "Use assignment prompt sources for requirements, lecture notes for concepts, "
        "and proposed-solution sources only for critique."
    )
    return "\n".join(lines)


def _general_fe524_reply(query: str) -> str:
    client = rag_service.ensure_openai_client()
    if not client:
        return (
            "I can help, but the OpenAI client is not configured right now. "
            "Please check the backend OPENAI_API_KEY setting and try again."
        )

    try:
        answer_mode = _answer_mode(query)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": PromptService.SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": PromptService.GENERAL_CHAT_PROMPT_TEMPLATE.format(
                        query=query,
                        answer_mode=answer_mode,
                    ),
                },
            ],
            temperature=0.35,
            max_tokens=2200,
        )
        return response.choices[0].message.content or "I could not generate a useful answer. Please try rephrasing the question."
    except Exception as exc:
        logger.error(f"General FE524 reply failed: {exc}")
        return f"I ran into an issue while generating the answer: {exc}"


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
        should_use_materials = bool(material_ids) or _mentions_material_context(query_text)
        answer_mode = _answer_mode(query_text)
        retrieval_limit = 8 if answer_mode in {"assignment", "review"} else settings.TOP_K_RESULTS

        if _is_greeting(query_text):
            answer = (
                "Hi! I am your FE524 tutor. Ask me a concept question, select/upload notes, "
                "or paste a homework problem and I will guide you through it."
            )
            return _save_chat_response(db, query_text, answer, [])

        if _is_out_of_scope(query_text):
            answer = (
                "I am best used as your FE524 and academic tutor. Ask me about course concepts, "
                "homework methods, formulas, lecture notes, studying, or technical learning questions."
            )
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
                top_k=retrieval_limit,
                material_ids=material_ids,
            )
            if not relevant_chunks:
                relevant_chunks = _retrieve_text_chunks_from_materials(
                    db=db,
                    query=query_text,
                    material_ids=material_ids,
                    top_k=retrieval_limit,
                )
            if answer_mode in {"assignment", "review"}:
                overview_chunks = _assignment_overview_chunks(
                    db=db,
                    material_ids=material_ids,
                    top_k=4,
                )
                overview_ids = {
                    (chunk.get("material_id"), chunk.get("chunk_idx"))
                    for chunk in overview_chunks
                }
                relevant_chunks = overview_chunks + [
                    chunk
                    for chunk in relevant_chunks
                    if (chunk.get("material_id"), chunk.get("chunk_idx")) not in overview_ids
                ]

            if relevant_chunks:
                if answer_mode in {"assignment", "review"}:
                    relevant_chunks = [{
                        "chunk": _source_briefing(relevant_chunks),
                        "material_id": "source-briefing",
                        "material_name": "source briefing",
                        "material_role": "reasoning guide",
                        "score": 1.0,
                    }] + relevant_chunks
                answer, sources = rag_service.generate_answer(
                    query=query_text,
                    relevant_chunks=relevant_chunks,
                    answer_mode=answer_mode,
                )
            else:
                answer = _general_fe524_reply(query_text)
                sources = []
        else:
            relevant_chunks = []
            if should_use_materials:
                relevant_chunks = rag_service.retrieve_relevant_chunks(
                    query=query_text,
                    top_k=retrieval_limit,
                    material_ids=material_ids,
                )
                if not relevant_chunks:
                    relevant_chunks = _retrieve_text_chunks_from_materials(
                        db=db,
                        query=query_text,
                        material_ids=material_ids,
                        top_k=retrieval_limit,
                    )
                if answer_mode in {"assignment", "review"}:
                    overview_chunks = _assignment_overview_chunks(
                        db=db,
                        material_ids=material_ids,
                        top_k=4,
                    )
                    overview_ids = {
                        (chunk.get("material_id"), chunk.get("chunk_idx"))
                        for chunk in overview_chunks
                    }
                    relevant_chunks = overview_chunks + [
                        chunk
                        for chunk in relevant_chunks
                        if (chunk.get("material_id"), chunk.get("chunk_idx")) not in overview_ids
                    ]

            if relevant_chunks:
                if answer_mode in {"assignment", "review"}:
                    relevant_chunks = [{
                        "chunk": _source_briefing(relevant_chunks),
                        "material_id": "source-briefing",
                        "material_name": "source briefing",
                        "material_role": "reasoning guide",
                        "score": 1.0,
                    }] + relevant_chunks
                answer, sources = rag_service.generate_answer(
                    query=query_text,
                    relevant_chunks=relevant_chunks,
                    answer_mode=answer_mode,
                )
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
