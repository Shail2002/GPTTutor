# FE524 AI Tutor - MVP

A polished, course-specific AI teaching assistant for FE524 Financial Engineering students. Students can upload course materials, ask RAG-based questions, and access study tools like summaries, flashcards, and quizzes.

## 📋 Features

### Phase 1: UI Foundation ✅
- Modern, academic-focused landing page
- Dashboard with material management
- Chat workspace with left sidebar
- Materials browser

### Phase 2: File Upload & Parsing
- PDF upload and parsing
- Text extraction and metadata storage
- Material versioning and management

### Phase 3: RAG Chat
- Document chunking and embedding (OpenAI + Chroma)
- Course-specific question answering
- Source citations

### Phase 4: Study Tools
- AI-generated lecture summaries
- Flashcard generation
- Quick quiz creation

### Phase 5: Audio Features
- Text-to-speech for summaries
- Voice input for questions
- Audio answer playback

### Phase 6: Polish
- Session persistence
- Recent chat history
- Better citations and feedback
- Loading and empty states

## 🏗️ Architecture

```
FE524 AI Tutor/
├── frontend/          # Next.js 14 + React 18 + Tailwind
├── backend/           # FastAPI Python server
├── shared/            # Prompts, schemas, constants
└── docs/              # Architecture & API specs
```

## 🚀 Quick Start

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main.server:app --reload
```

## 📖 API Documentation

See [docs/API_SPEC.md](docs/API_SPEC.md) for full API reference.

## 📁 Key Files

- `frontend/app/page.tsx` - Landing page
- `frontend/app/dashboard/page.tsx` - Dashboard
- `frontend/app/chat/page.tsx` - Chat workspace
- `backend/app/main/server.py` - FastAPI app
- `shared/prompts.py` - Prompt templates
- `docs/ARCHITECTURE.md` - Full architecture guide

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, SQLAlchemy, Pydantic, Python 3.11+
- **AI**: OpenAI API, LangChain, Chroma vector DB
- **Database**: PostgreSQL (metadata), Chroma (embeddings)
- **Storage**: Local filesystem (can scale to S3)

## 📝 Development Status

Phase-based implementation with clear checkpoints. See [docs/PHASED_PLAN.md](docs/PHASED_PLAN.md).

## 📄 License

MIT
