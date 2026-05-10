import os
import tempfile
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
import requests

from app.models.schemas import AudioTTSRequest, AudioTranscriptionResponse
from app.services.rag import rag_service
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/tts/elevenlabs")
async def elevenlabs_text_to_speech(request: AudioTTSRequest):
    """Convert text to an MP3 audio stream using ElevenLabs.

    Expects ELEVENLABS_API_KEY in backend env (.env).
    """
    api_key = (settings.ELEVENLABS_API_KEY or "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="ElevenLabs is not configured")

    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    voice_id = (settings.ELEVENLABS_VOICE_ID or "").strip() or "EXAVITQu4vr4xnSDxMaL"

    try:
        # Use the streaming endpoint (works well for MP3 and is the recommended path).
        resp = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream",
            headers={
                "xi-api-key": api_key,
                "accept": "audio/mpeg",
                "content-type": "application/json",
            },
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                },
            },
            timeout=30,
        )

        if resp.status_code >= 400:
            # Bubble up provider error for easier debugging
            raise HTTPException(
                status_code=400,
                detail=f"ElevenLabs error ({resp.status_code}): {resp.text}",
            )

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
            temp_path = temp_file.name
            temp_file.write(resp.content)

        return FileResponse(
            temp_path,
            media_type="audio/mpeg",
            filename="audio.mp3",
            background=BackgroundTask(os.remove, temp_path),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"ElevenLabs TTS generation failed: {exc}")
        raise HTTPException(status_code=500, detail="Failed to generate audio")


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