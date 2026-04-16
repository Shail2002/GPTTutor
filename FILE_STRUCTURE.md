# FE524 AI Tutor - File Structure Reference

```
/Users/shailshah/Downloads/ASSGPT/
│
├── 📄 README.md                        # Project overview
├── 📄 PROJECT_OVERVIEW.md              # Comprehensive overview (START HERE)
├── 📄 QUICKSTART.md                    # 5-minute setup guide
├── 📄 IMPLEMENTATION_SUMMARY.md        # What was built
├── 📄 TASKS.md                         # Development checklist
├── 📄 .env.example                     # Environment template
├── 📄 .gitignore                       # Git ignore rules
├── 📄 setup.sh                         # Unix setup script
├── 📄 setup.ps1                        # Windows setup script
│
├── 📁 frontend/                        # Next.js 14 + React 18 Frontend
│   ├── 📁 app/                         # Next.js app directory
│   │   ├── 📄 page.tsx                 # Landing page (✓ Complete)
│   │   ├── 📄 layout.tsx               # Root layout (✓)
│   │   ├── 📄 globals.css              # Global styles (✓)
│   │   ├── 📁 dashboard/
│   │   │   ├── 📄 page.tsx             # Dashboard page (✓)
│   │   │   └── 📄 layout.tsx           # Dashboard layout (✓)
│   │   ├── 📁 chat/
│   │   │   ├── 📄 page.tsx             # Chat page (✓)
│   │   │   └── 📄 layout.tsx           # Chat layout (✓)
│   │   └── 📁 materials/
│   │       ├── 📄 page.tsx             # Materials page (✓)
│   │       └── 📄 layout.tsx           # Materials layout (✓)
│   ├── 📁 components/                  # Reusable React components (ready)
│   ├── 📁 lib/
│   │   ├── 📄 api.ts                   # API client (✓)
│   │   └── 📄 store.ts                 # Zustand state (✓)
│   ├── 📁 public/                      # Static assets
│   ├── 📄 package.json                 # Dependencies (✓)
│   ├── 📄 tsconfig.json                # TypeScript config (✓)
│   ├── 📄 tailwind.config.ts           # Tailwind theme (✓)
│   ├── 📄 next.config.js               # Next.js config (✓)
│   ├── 📄 postcss.config.js            # PostCSS config (✓)
│   └── 📄 .eslintrc.json               # ESLint config (✓)
│
├── 📁 backend/                         # FastAPI Python Backend
│   ├── 📁 app/
│   │   ├── 📁 main/
│   │   │   ├── 📄 __init__.py          # Package init
│   │   │   └── 📄 server.py            # FastAPI app setup (✓)
│   │   ├── 📁 routes/
│   │   │   ├── 📄 __init__.py          # Package init
│   │   │   ├── 📄 health.py            # Health check (✓)
│   │   │   ├── 📄 materials_routes.py  # Materials API (ready)
│   │   │   ├── 📄 chat_routes.py       # Chat API (ready)
│   │   │   └── 📄 study_routes.py      # Study tools API (ready)
│   │   ├── 📁 services/
│   │   │   ├── 📄 __init__.py          # Package init
│   │   │   ├── 📄 rag.py               # RAG pipeline (architecture)
│   │   │   └── 📄 document.py          # Document processing (ready)
│   │   ├── 📁 models/
│   │   │   ├── 📄 __init__.py          # Package init
│   │   │   ├── 📄 schemas.py           # Pydantic models (✓)
│   │   │   └── 📄 database.py          # SQLAlchemy models (✓)
│   │   ├── 📄 __init__.py              # Package init
│   │   └── 📄 config.py                # Settings (✓)
│   ├── 📄 requirements.txt             # Python dependencies (✓)
│   └── 📄 .env                         # Configure with OpenAI key
│
├── 📁 shared/                          # Shared utilities (future)
│   ├── 📄 prompts.py                   # Prompt templates (structure)
│   └── 📄 constants.py                 # Constants (structure)
│
├── 📁 docs/                            # Documentation
│   ├── 📄 ARCHITECTURE.md              # System architecture & design (✓)
│   ├── 📄 API_SPEC.md                  # REST API reference (✓)
│   └── 📄 PHASED_PLAN.md               # 6-phase roadmap (✓)
│
└── 📁 data/                            # Runtime data (created on startup)
    ├── 📁 uploads/                     # Uploaded materials
    ├── 📁 .chroma/                     # Chroma vector DB
    └── 📄 *logs                        # Log files
```

## 📖 Reading Guide

### For First-Time Setup
1. Read: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) (2 min)
2. Read: [QUICKSTART.md](QUICKSTART.md) (5 min)
3. Run: `cd frontend && npm install && npm run dev`
4. Browse: http://localhost:3000

### For Understanding Architecture
1. Read: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (10 min)
2. Review: [docs/API_SPEC.md](docs/API_SPEC.md) (5 min)
3. Check: [backend/app/models/database.py](backend/app/models/database.py)

### For Implementation Planning
1. Read: [docs/PHASED_PLAN.md](docs/PHASED_PLAN.md) (15 min)
2. Check: [TASKS.md](TASKS.md) for task list
3. Start: Phase 2 tasks

### For Deployment
1. Read: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Deployment section
2. Check: [setup.sh](setup.sh) / [setup.ps1](setup.ps1)
3. Follow: [TASKS.md](TASKS.md) - Deployment checklist

## 🔑 Key Configuration Files

### Frontend Configuration
- [frontend/next.config.js](frontend/next.config.js) - API URL setup
- [frontend/tailwind.config.ts](frontend/tailwind.config.ts) - Color theme
- [frontend/tsconfig.json](frontend/tsconfig.json) - TypeScript strict mode

### Backend Configuration
- [backend/app/config.py](backend/app/config.py) - All settings
- [.env.example](.env.example) - Environment template
- [backend/requirements.txt](backend/requirements.txt) - Python packages

## 📊 Component Layout

### Frontend Components (Ready to Build)
```
components/
├── MaterialsList.tsx          # Display uploaded materials
├── ChatMessage.tsx            # Individual message display
├── UploadZone.tsx             # Drag-and-drop upload
├── Sidebar.tsx                # Navigation sidebar
├── LoadingSpinner.tsx         # Loading states
├── EmptyState.tsx             # Empty state displays
└── CitationCard.tsx           # Source citations
```

### Backend Endpoints (Ready to Implement)
```
Authentication
- POST   /api/auth/register
- POST   /api/auth/login

Materials
- POST   /api/materials/upload      # File upload
- GET    /api/materials             # List materials
- DELETE /api/materials/{id}        # Delete material

Chat
- POST   /api/chat                  # Ask question
- GET    /api/chat/history          # Get history

Study Tools
- POST   /api/study/summary/{id}
- POST   /api/study/flashcards/{id}
- POST   /api/study/quiz/{id}
```

## 🔄 Data Models (Ready)

### User
- id (UUID)
- email
- name
- hashed_password
- created_at

### Material
- id (UUID)
- user_id (FK)
- name
- status (processing/analyzed/failed)
- file_path
- pages
- uploaded_at
- processed_at

### Chat
- id (UUID)
- user_id (FK)
- query
- response
- sources (material IDs)
- created_at

### Study Tools (Summary, Flashcard, Quiz)
- id (UUID)
- user_id (FK)
- material_id (FK)
- content (varies by type)
- created_at

## 🛠️ Development Workflow

### Making Changes

**Frontend**:
```bash
cd frontend
vim app/dashboard/page.tsx    # Edit file
# Changes auto-reload at http://localhost:3000
```

**Backend**:
```bash
cd backend
source venv/bin/activate
vim app/routes/chat_routes.py # Edit file
# Changes auto-reload with --reload flag
```

### Building Features

1. **Feature Checklist**:
   - [ ] Design UI (frontend wireframe or screenshot)
   - [ ] Define API contract (request/response)
   - [ ] Create database schema if needed
   - [ ] Implement backend endpoint
   - [ ] Build frontend component
   - [ ] Test end-to-end flow
   - [ ] Add to TASKS.md as complete

2. **Code Quality**:
   - [ ] TypeScript strict mode
   - [ ] Pydantic validation
   - [ ] Error handling
   - [ ] Comments for complex logic
   - [ ] Tests (unit + integration)

## ✅ Verification Checklist

### Frontend Ready
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts without errors
- [ ] All 4 pages load (/, /dashboard, /chat, /materials)
- [ ] Sidebar navigation works
- [ ] No console errors
- [ ] Responsive on mobile (try phone size)

### Backend Ready
- [ ] `pip install -r requirements.txt` works
- [ ] `python -m uvicorn app.main.server:app --reload` starts
- [ ] Health check: `curl http://localhost:8000/api/health`
- [ ] Swagger UI: http://localhost:8000/docs loads
- [ ] No Python errors in console

### Full Stack Ready
- [ ] Frontend connects to backend (no CORS errors)
- [ ] API client initialized correctly
- [ ] Can make test API calls from browser console

## 🚀 Phase 2 Starting Point

When ready to start Phase 2:

1. Set up PostgreSQL locally
2. Update [backend/app/config.py](backend/app/config.py):
   - `DATABASE_URL` to your PostgreSQL connection
3. Create database:
   ```bash
   createdb fe524_tutor
   ```
4. Run migrations (when setup):
   ```bash
   alembic upgrade head
   ```
5. Implement [backend/app/routes/materials_routes.py](backend/app/routes/materials_routes.py) upload endpoint
6. See [docs/PHASED_PLAN.md#phase-2](docs/PHASED_PLAN.md#phase-2-file-upload--parsing)

---

**All files organized and ready for development.** Start with [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) 📖
