from datetime import datetime
from pathlib import Path
import os
import uuid

import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import logging

from app.config import settings
from app.db import get_db
from app.models.database import Material
from app.models.schemas import MaterialResponse
from app.services.document import document_processor
from app.services.rag import RAGService

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize RAG service for embeddings
rag_service = RAGService()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

@router.post("/upload")
async def upload_material(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> MaterialResponse:
    """
    Upload a course material (PDF, DOCX, TXT)
    Extracts text, chunks, and embeds into vector DB for RAG
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, DOCX, or TXT")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 50MB limit")

    material_id = str(uuid.uuid4())
    stored_filename = f"{material_id}{extension}"
    stored_path = Path(settings.UPLOAD_DIR) / stored_filename

    try:
        # Save file to disk
        async with aiofiles.open(stored_path, "wb") as f:
            await f.write(content)

        # Extract text from document
        extracted_text, pages = document_processor.process_file(str(stored_path))
        text_path = Path(settings.UPLOAD_DIR) / f"{material_id}.txt"
        async with aiofiles.open(text_path, "w", encoding="utf-8") as text_file:
            await text_file.write(extracted_text)

        # Create material record in database
        material = Material(
            id=material_id,
            name=file.filename,
            file_path=str(stored_path),
            file_size_mb=round(len(content) / (1024 * 1024), 2),
            pages=pages,
            status="indexing",
            processed_at=datetime.utcnow(),
        )
        db.add(material)
        db.commit()
        db.refresh(material)

        # Chunk and embed text for RAG vector DB
        try:
            chunks = rag_service.chunk_document(extracted_text)
            rag_service.store_embeddings(
                material_id=material_id,
                chunks=chunks,
                material_name=file.filename
            )
            logger.info(f"Embedded {len(chunks)} chunks for material {material_id}")
            
            # Update status to indexed
            material.status = "indexed"
            db.commit()
            db.refresh(material)
        except Exception as embedding_error:
            logger.warning(f"Failed to embed material {material_id}: {embedding_error}")
            # Continue even if embedding fails - material is still usable
            material.status = "analyzed"
            db.commit()
            db.refresh(material)

        return MaterialResponse(
            id=material.id,
            name=material.name,
            status=material.status,
            uploaded_at=material.uploaded_at,
            pages=material.pages,
            size_mb=material.file_size_mb,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to upload material: %s", exc)
        if stored_path.exists():
            os.remove(stored_path)
        raise HTTPException(status_code=500, detail="Failed to process uploaded file")

@router.get("")
@router.get("/")
async def list_materials(db: Session = Depends(get_db)) -> list[MaterialResponse]:
    """
    List all uploaded materials for authenticated user
    """
    materials = db.query(Material).order_by(Material.uploaded_at.desc()).all()
    return [
        MaterialResponse(
            id=material.id,
            name=material.name,
            status=material.status,
            uploaded_at=material.uploaded_at,
            pages=material.pages,
            size_mb=material.file_size_mb,
        )
        for material in materials
    ]

@router.delete("/{material_id}")
async def delete_material(material_id: str, db: Session = Depends(get_db)):
    """
    Delete a material and its embeddings
    """
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    if material.file_path and os.path.exists(material.file_path):
        os.remove(material.file_path)

    text_path = Path(settings.UPLOAD_DIR) / f"{material_id}.txt"
    if text_path.exists():
        os.remove(text_path)

    db.delete(material)
    db.commit()
    return {"success": True}
