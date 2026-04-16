import os
import tempfile
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.models.schemas import AudioTTSRequest, AudioTranscriptionResponse
from app.services.rag import rag_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/tts")
async def text_to_speech(request: AudioTTSRequest):
    """Convert text to an MP3 audio stream using OpenAI TTS."""
    if not rag_service.ensure_openai_client():
        raise HTTPException(status_code=400, detail="OpenAI client not configured")

    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        response = rag_service.openai_client.audio.speech.create(
            model="tts-1",
            voice=request.voice or "alloy",
            input=text,
            response_format="mp3",
        )

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
            temp_path = temp_file.name

        response.stream_to_file(temp_path)
        return FileResponse(
            temp_path,
            media_type="audio/mpeg",
            filename="audio.mp3",
            background=BackgroundTask(os.remove, temp_path),
        )
    except Exception as exc:
        logger.error(f"TTS generation failed: {exc}")
        raise HTTPException(status_code=500, detail="Failed to generate audio")


@router.post("/transcribe", response_model=AudioTranscriptionResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe uploaded audio using OpenAI Whisper."""
    if not rag_service.ensure_openai_client():
        raise HTTPException(status_code=400, detail="OpenAI client not configured")

    try:
        await file.seek(0)
        file_bytes = await file.read()
        transcription = rag_service.openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=(file.filename or "audio.webm", file_bytes, file.content_type or "audio/webm"),
        )

        return AudioTranscriptionResponse(
            text=transcription.text,
            language=getattr(transcription, "language", None),
        )
    except Exception as exc:
        logger.error(f"Audio transcription failed: {exc}")
        raise HTTPException(status_code=500, detail="Failed to transcribe audio")