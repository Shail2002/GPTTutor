from fastapi import APIRouter
from app.models.schemas import HealthCheckResponse
from app.config import settings

router = APIRouter()

@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.API_VERSION,
    }
