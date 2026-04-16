from datetime import datetime
import json
import re
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
import logging
from sqlalchemy.orm import Session

from app.models.schemas import (
    FlashcardRequest,
    SummaryRequest,
    SummaryResponse,
    FlashcardSet,
    QuizRequest,
    QuizResponse,
)
from app.models.database import Material, Summary, Flashcard, Quiz
from app.db import get_db
from app.config import settings
from app.services.rag import rag_service, prompt_service

router = APIRouter()
logger = logging.getLogger(__name__)


def _load_material_text(material_id: str) -> str:
    text_path = Path(settings.UPLOAD_DIR) / f"{material_id}.txt"
    if not text_path.exists():
        raise HTTPException(status_code=404, detail="Extracted material text not found")
    return text_path.read_text(encoding="utf-8")


def _strip_code_fences(payload: str) -> str:
    cleaned = payload.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z0-9_\-]*\n", "", cleaned)
        cleaned = re.sub(r"\n```$", "", cleaned)
    return cleaned.strip()


def _extract_key_points(summary_text: str) -> list[str]:
    key_points: list[str] = []
    for line in summary_text.splitlines():
        stripped = line.strip()
        if stripped.startswith(("- ", "* ")):
            key_points.append(stripped[2:].strip())
        elif re.match(r"^\d+\.\s+", stripped):
            key_points.append(re.sub(r"^\d+\.\s+", "", stripped))
        if len(key_points) >= 5:
            break
    return key_points


def _chat_with_fallback(prompt: str, temperature: float = 0.4, max_tokens: int = 1200) -> str:
    if not rag_service.ensure_openai_client():
        raise HTTPException(status_code=400, detail="OpenAI client not configured")

    model_candidates = [settings.OPENAI_MODEL, "gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"]
    last_error: Optional[Exception] = None

    for model_name in dict.fromkeys(model_candidates):
        try:
            response = rag_service.ensure_openai_client().chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": prompt_service.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content or ""
        except Exception as exc:
            last_error = exc

    raise HTTPException(status_code=500, detail=f"OpenAI request failed: {last_error}")

@router.post("/summary/{material_id}", response_model=SummaryResponse)
async def generate_summary(
    material_id: str,
    request: SummaryRequest,
    db: Session = Depends(get_db),
):
    """
    Generate AI summary of course material
    """
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    content = _load_material_text(material_id)
    prompt = prompt_service.SUMMARY_PROMPT_TEMPLATE.format(
        content=content[:30000],
        length=request.length or "medium",
    )

    summary_text = _chat_with_fallback(prompt, temperature=0.4, max_tokens=1200)
    key_points = _extract_key_points(summary_text)

    summary_record = Summary(
        id=str(uuid.uuid4()),
        user_id=None,
        material_id=material_id,
        summary=summary_text,
        key_points=json.dumps(key_points),
        created_at=datetime.utcnow(),
    )
    db.add(summary_record)
    db.commit()
    db.refresh(summary_record)

    return SummaryResponse(
        id=summary_record.id,
        material_id=summary_record.material_id,
        summary=summary_record.summary,
        key_points=key_points,
        created_at=summary_record.created_at,
    )

@router.post("/flashcards/{material_id}", response_model=FlashcardSet)
async def generate_flashcards(
    material_id: str,
    request: FlashcardRequest,
    db: Session = Depends(get_db),
):
    """
    Generate flashcards from course material
    """
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    count = min(max(request.count, 1), 30)
    content = _load_material_text(material_id)
    prompt = prompt_service.FLASHCARD_PROMPT_TEMPLATE.format(
        content=content[:30000],
        count=count,
    )

    raw = _chat_with_fallback(prompt, temperature=0.2, max_tokens=1600)
    raw = _strip_code_fences(raw)

    try:
        cards = json.loads(raw)
    except Exception:
        # Fallback parse when model adds prose around JSON
        match = re.search(r"\[.*\]", raw, flags=re.S)
        if not match:
            raise HTTPException(status_code=500, detail="Failed to parse flashcards response")
        cards = json.loads(match.group(0))

    if not isinstance(cards, list):
        raise HTTPException(status_code=500, detail="Invalid flashcards format")

    flashcard_set_id = str(uuid.uuid4())
    normalized_cards: list[dict] = []

    for item in cards[:count]:
        question = str(item.get("question", "")).strip()
        answer = str(item.get("answer", "")).strip()
        if not question or not answer:
            continue

        normalized_cards.append({"question": question, "answer": answer})
        db.add(
            Flashcard(
                id=str(uuid.uuid4()),
                user_id=None,
                material_id=material_id,
                question=question,
                answer=answer,
                created_at=datetime.utcnow(),
            )
        )

    db.commit()

    return FlashcardSet(
        id=flashcard_set_id,
        material_id=material_id,
        count=len(normalized_cards),
        cards=normalized_cards,
        created_at=datetime.utcnow(),
    )

@router.post("/quiz/{material_id}", response_model=QuizResponse)
async def generate_quiz(
    material_id: str,
    request: QuizRequest,
    db: Session = Depends(get_db),
):
    """
    Generate quiz questions from material
    """
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    questions = min(max(request.questions, 1), 20)
    content = _load_material_text(material_id)
    prompt = prompt_service.QUIZ_PROMPT_TEMPLATE.format(
        content=content[:30000],
        questions=questions,
    )

    raw = _chat_with_fallback(prompt, temperature=0.2, max_tokens=1800)
    raw = _strip_code_fences(raw)

    try:
        quiz_questions = json.loads(raw)
    except Exception:
        match = re.search(r"\[.*\]", raw, flags=re.S)
        if not match:
            raise HTTPException(status_code=500, detail="Failed to parse quiz response")
        quiz_questions = json.loads(match.group(0))

    if not isinstance(quiz_questions, list):
        raise HTTPException(status_code=500, detail="Invalid quiz format")

    quiz_record = Quiz(
        id=str(uuid.uuid4()),
        user_id=None,
        material_id=material_id,
        questions=json.dumps(quiz_questions[:questions]),
        created_at=datetime.utcnow(),
    )
    db.add(quiz_record)
    db.commit()
    db.refresh(quiz_record)

    return QuizResponse(
        id=quiz_record.id,
        material_id=material_id,
        questions=quiz_questions[:questions],
        created_at=quiz_record.created_at,
    )
