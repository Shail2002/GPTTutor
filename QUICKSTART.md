# FE524 AI Tutor - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL (optional for MVP)
- OpenAI API key

### Quick Setup

#### 1. Clone & Navigate
```bash
cd /Users/shailshah/Downloads/ASSGPT
```

#### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: http://localhost:3000

#### 3. Setup Backend (New Terminal)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main.server:app --reload
```
Backend runs at: http://localhost:8000

#### 4. View API Docs
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📁 Project Structure

```
FE524 AI Tutor/
├── frontend/                 # Next.js React App
│   ├── app/                 # Routes and pages
│   │   ├── page.tsx         # Landing page
│   │   ├── layout.tsx       # Root layout
│   │   ├── chat/            # Chat workspace
│   │   ├── dashboard/       # Dashboard
│   │   └── materials/       # Materials page
│   ├── components/          # Reusable components
│   ├── lib/                 # Utilities
│   │   ├── api.ts          # API client
│   │   └── store.ts        # Zustand store
│   ├── public/             # Static assets
│   ├── package.json        # Dependencies
│   └── tailwind.config.ts  # Tailwind setup
│
├── backend/                 # FastAPI Python Server
│   ├── app/
│   │   ├── main/           # App initialization
│   │   │   └── server.py   # FastAPI app
│   │   ├── routes/         # API endpoints
│   │   │   ├── health.py
│   │   │   ├── materials_routes.py
│   │   │   ├── chat_routes.py
│   │   │   └── study_routes.py
│   │   ├── services/       # Business logic
│   │   │   ├── rag.py      # RAG pipeline
│   │   │   └── document.py # Document processing
│   │   └── models/         # Data models
│   │       ├── schemas.py  # Pydantic schemas
│   │       └── database.py # SQLAlchemy models
│   ├── config.py           # Configuration
│   ├── requirements.txt    # Dependencies
│   └── .env               # Environment variables
│
├── shared/                 # Shared utilities (future)
│   ├── prompts.py         # Prompt templates
│   └── constants.py       # Shared constants
│
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md    # System architecture
│   ├── API_SPEC.md       # API reference
│   └── PHASED_PLAN.md    # Implementation plan
│
├── .env.example          # Example environment
├── README.md             # Project overview
└── .gitignore           # Git ignore rules
```

## 🔧 Configuration

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/fe524_tutor
DEBUG=True
```

## 🌐 Browse the App

### Landing Page
- **URL:** http://localhost:3000
- **Shows:** Product overview, features, CTA

### Dashboard
- **URL:** http://localhost:3000/dashboard
- **Shows:** Recent materials, quick actions, upload CTA

### Chat
- **URL:** http://localhost:3000/chat
- **Shows:** Chat interface with Q&A (mock data)

### Materials
- **URL:** http://localhost:3000/materials
- **Shows:** Material management and upload zone

## 📚 Key Features (Phase 1 Complete)

✅ **Landing Page**
- Hero section with clear value prop
- Feature showcase with icons
- CTA buttons to dashboard/chat
- Footer with links

✅ **Dashboard**
- Left sidebar with navigation
- Quick action cards
- Recent materials list with status
- Upload prompt

✅ **Chat Workspace**
- Message list with user/assistant roles
- Source citations
- Input field with send button
- Message timestamps

✅ **Materials Management**
- List of uploaded materials
- Status indicators
- Bulk actions (delete, download, view)
- Drag-and-drop upload zone

## 🔌 API Integration Points (Ready for Phase 2)

Frontend API client configured in `frontend/lib/api.ts`:
```typescript
apiClient.uploadMaterial(file)
apiClient.getMaterials()
apiClient.chat(query, materialIds)
apiClient.getChatHistory()
apiClient.generateSummary(materialId)
apiClient.generateFlashcards(materialId)
apiClient.generateQuiz(materialId)
```

## 📊 Next Steps

### Phase 2: File Upload & Parsing
1. Implement database setup
2. Add file upload endpoint
3. Create document processor
4. Build upload UI integration

### Phase 3: RAG Chat
1. Initialize Chroma vector DB
2. Implement embedding pipeline
3. Build retrieval logic
4. Connect chat interface

## 🐛 Troubleshooting

### Frontend Won't Start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend Port Already in Use
```bash
# Use different port
python -m uvicorn app.main.server:app --reload --port 8001
# Update NEXT_PUBLIC_API_URL in frontend
```

### OpenAI API Key Error
```bash
# Verify .env file has valid key
echo $OPENAI_API_KEY
# Add to .env: OPENAI_API_KEY=sk-your-key-here
```

## 📝 Development Tips

### Hot Reload
- Frontend: Automatic on file change (Next.js)
- Backend: Automatic on file change (`--reload` flag)

### Type Safety
- Frontend: TypeScript (strict mode)
- Backend: Pydantic models for validation

### Database Migrations (When Needed)
```bash
# Using Alembic (to setup)
alembic init alembic
alembic revision --autogenerate -m "Initial"
alembic upgrade head
```

## 🚢 Deployment Preview

### Docker (Optional for Development)
```bash
# Backend
docker build -t fe524-tutor-backend ./backend
docker run -p 8000:8000 fe524-tutor-backend

# Frontend
docker build -t fe524-tutor-frontend ./frontend
docker run -p 3000:3000 fe524-tutor-frontend
```

### Production Deployment
See Phase 2+ documentation for full deployment guide.

## 📞 Support

For issues, refer to:
- [Architecture Guide](docs/ARCHITECTURE.md)
- [API Specification](docs/API_SPEC.md)
- [Phased Implementation Plan](docs/PHASED_PLAN.md)

---

**Happy Building! 🎓**
