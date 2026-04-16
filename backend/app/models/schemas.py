from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Literal

# Material Models
class MaterialCreate(BaseModel):
    name: str
    description: Optional[str] = None

class MaterialResponse(BaseModel):
    id: str
    name: str
    status: str  # processing, analyzed, failed
    uploaded_at: datetime
    pages: int
    size_mb: float

    class Config:
        from_attributes = True

# Chat Models
class ChatMessage(BaseModel):
    query: str
    material_ids: Optional[List[str]] = []

class ChatResponse(BaseModel):
    id: str
    query: str
    response: str
    sources: List[str]
    timestamp: datetime

# Study Tools Models
class SummaryRequest(BaseModel):
    length: Optional[Literal["short", "medium", "long"]] = "medium"

class FlashcardRequest(BaseModel):
    count: int = 10
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"

class QuizRequest(BaseModel):
    questions: int = 5
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"

class SummaryResponse(BaseModel):
    id: str
    material_id: str
    summary: str
    key_points: List[str]
    created_at: datetime

class FlashcardSet(BaseModel):
    id: str
    material_id: str
    count: int
    cards: List[dict]  # {question, answer}
    created_at: datetime

class QuizResponse(BaseModel):
    id: str
    material_id: str
    questions: List[dict]  # {question, options, correct_answer}
    created_at: datetime

# Audio Models
class AudioTTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "alloy"

class AudioTranscriptionResponse(BaseModel):
    text: str
    language: Optional[str] = None

# Auth Models
class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Health Check
class HealthCheckResponse(BaseModel):
    status: str
    version: str
