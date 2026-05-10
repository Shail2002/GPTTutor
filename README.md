# 🚀 GPTTutor  
### AI-Powered Course Tutor Platform for Modern Learning

GPTTutor is a full-stack AI tutor platform built with **Next.js 14** and **FastAPI**, designed to help students learn faster through course-scoped AI tutoring, study tools, document understanding, and voice interactions.

The platform combines:
- AI-powered tutoring
- RAG-based document Q&A
- Study automation
- Voice AI
- Course-centric workflows

Built for scalable academic assistance and future AI-native education systems.

---

# ✨ Core Features

## 🔐 Authentication & User Flow
- Google OAuth login
- Secure cookie-based sessions
- Protected course workspaces
- SaaS-style onboarding flow
- Course-scoped navigation system

## 📚 AI Tutor System
- Course-specific AI chat
- RAG pipeline architecture
- Context-aware tutoring
- Document-based Q&A
- Source-grounded responses

## 📄 Materials & Knowledge Base
- PDF upload support
- Lecture material parsing
- AI embeddings + semantic retrieval
- Chroma vector database integration
- Course material management

## 🧠 Study Tools
- AI-generated summaries
- Flashcard generation
- Quiz generation
- Smart revision workflows

## 🎙️ Voice & Audio AI
- Voice question support
- Text-to-speech responses
- ElevenLabs integration
- Real-time tutor interaction

## 📞 Live Calling System
- Vapi outbound calling integration
- AI tutoring call scaffolding
- Live tutoring workflow support

---

# 🏗️ Tech Stack

## Frontend
- **Next.js 14 (App Router)**
- React 18
- TypeScript
- TailwindCSS
- Zustand

## Backend
- FastAPI
- Pydantic v2
- SQLAlchemy
- HTTPX / Requests

## AI & Integrations
- OpenAI API
- Chroma Vector DB
- ElevenLabs
- Vapi
- Google OAuth

---

# 📁 Project Structure

```bash
.
├── frontend/                 # Next.js frontend
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── middleware.ts
│
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── main/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── config.py
│   └── requirements.txt
│
├── docs/                     # Architecture & API docs
│
└── README.md

# 🔄 Product Roadmap

## ✅ Phase 1 — UI Foundation
- SaaS-style authentication flow
- Dashboard system
- Course onboarding
- Tutor workspace UI
- Materials interface
- Study tool pages

## 🚧 Phase 2 — File Processing
- PDF ingestion
- Parsing & chunking
- Metadata management
- Material versioning

## 🚧 Phase 3 — RAG Tutor Engine
- Embedding pipeline
- Semantic retrieval
- Course-specific AI responses
- Citation support

## 🚧 Phase 4 — AI Study System
- Lecture summarization
- Flashcard automation
- Quiz generation

## 🚧 Phase 5 — Audio Intelligence
- Speech-to-text
- AI voice responses
- Audio tutoring workflows

## 🚧 Phase 6 — Production Polish
- Session persistence
- Chat history
- Advanced loading states
- User feedback systems

---

# 🔐 Authentication Architecture

## Current Session Model (MVP)

The platform currently uses a cookie-based authentication system for simplicity and rapid iteration.

### Flow
1. User signs in with Google
2. Backend validates OAuth state
3. Session cookie is generated
4. Frontend middleware protects routes

### Session Cookies

```bash
fe524_session
fe524_user
fe524_name
```

---

# 🌐 Frontend Routes

| Route | Description |
|---|---|
| `/` | Sign-in page |
| `/landing` | Marketing page |
| `/onboarding` | Course setup |
| `/c/[courseSlug]/dashboard` | Main dashboard |
| `/chat` | AI tutor |
| `/materials` | Course materials |
| `/study/*` | Study tools |

---

# ⚡ Backend API Routes

## Health

```http
GET /api/health
```

## Authentication

```http
GET  /auth/google
GET  /auth/google/callback
GET  /api/auth/me
POST /api/auth/logout
```

## Materials

```http
/api/materials/*
```

## Chat

```http
/api/chat/*
```

## Study Tools

```http
/api/study/*
```

## Audio

```http
/api/audio/*
```

## Calls

```http
POST /api/calls/outbound
```

---

# 🚀 Local Development Setup

## 1️⃣ Backend Setup

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

python -m uvicorn app.main.server:app \
  --reload \
  --host 127.0.0.1 \
  --port 8000
```

### Backend Docs

- Swagger → `http://127.0.0.1:8000/docs`
- ReDoc → `http://127.0.0.1:8000/redoc`

---

## 2️⃣ Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

### Frontend

```bash
http://localhost:3000
```

---

# ⚙️ Environment Variables

## Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

# Backend `.env`

## Google OAuth

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback

FRONTEND_URL=http://localhost:3000

SESSION_COOKIE_NAME=fe524_session
```

## OpenAI

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

## ElevenLabs

```env
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

## Vapi

```env
VAPI_API_KEY=
VAPI_ASSISTANT_ID=
VAPI_PHONE_NUMBER_ID=
```

---

# 🧠 Core User Flow

## Course Learning Workflow

```text
Sign In
   ↓
Onboarding
   ↓
Create / Select Course
   ↓
Upload Materials
   ↓
AI Tutor Chat
   ↓
Generate Study Tools
   ↓
Voice / Live Tutor Features
```

---

# 🛡️ Security Notes

- Cookie-based auth for MVP
- Avoid committing `.env` files
- Rotate keys if exposed
- Use HTTPS in production
- Use `SameSite=None; Secure` cookies in production

---

# 🧪 Troubleshooting

## Missing `uvicorn`

```bash
pip install -r requirements.txt
```

## OAuth Redirect Issues

Use consistent hostnames:

- Either `localhost`
- Or `127.0.0.1`

Do not mix both.

## Unauthorized Routes

Check:
- Backend running
- Session cookie exists
- Middleware configuration

---

# 📚 Documentation

| File | Purpose |
|---|---|
| `START_HERE.md` | Initial repo guide |
| `QUICKSTART.md` | Quick setup |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/API_SPEC.md` | API reference |

---

# 🌟 Vision

GPTTutor is designed to evolve into a fully AI-native academic ecosystem where:

- Every course has its own AI tutor
- Every lecture becomes searchable knowledge
- Study workflows become automated
- Voice and real-time tutoring become seamless

The long-term goal is to create an intelligent learning infrastructure for modern education.

---

# 👨‍💻 Built With Passion For AI Education

If you like the project, consider starring the repo ⭐
