from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import logging

from app.config import settings
from app.db import init_db
from app.routes import health, materials_routes, chat_routes, study_routes, audio_routes

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title=settings.API_TITLE,
        description=settings.API_DESCRIPTION,
        version=settings.API_VERSION,
        debug=settings.DEBUG,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )

    # Routes
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(materials_routes.router, prefix="/api/materials", tags=["materials"])
    app.include_router(chat_routes.router, prefix="/api/chat", tags=["chat"])
    app.include_router(study_routes.router, prefix="/api/study", tags=["study"])
    app.include_router(audio_routes.router, prefix="/api/audio", tags=["audio"])

    @app.on_event("startup")
    def startup_event():
        init_db()

    # Error handlers
    @app.exception_handler(Exception)
    async def general_exception_handler(request, exc):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    return app

app = create_app()
