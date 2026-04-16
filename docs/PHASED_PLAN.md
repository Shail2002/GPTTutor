# FE524 AI Tutor - Phased Implementation Plan

## Overview
This document outlines the exact sequence and checkpoint for building FE524 AI Tutor in 6 phases.

## Phase 1: UI Foundation ✅ COMPLETE
**Timeline:** 1-2 days
**Goal:** Build polished, functional frontend UI matching screenshots

### Deliverables
- [x] Landing page (hero, features, CTA)
- [x] Dashboard (materials overview, quick actions)
- [x] Tutor chat workspace (message display, input)
- [x] Materials management page
- [x] Left sidebar navigation
- [x] API client library (axios wrapper)
- [x] Zustand state management setup

### Next Actions
- Install npm dependencies: `npm install`
- Run dev server: `npm run dev`
- Verify all pages load at http://localhost:3000

### Acceptance Criteria
✅ Landing page loads and displays all sections
✅ Dashboard shows sidebar and main content
✅ Chat interface renders with message list
✅ Materials page displays upload zone
✅ Navigation between pages works
✅ Styling matches provided screenshots

---

## Phase 2: File Upload + Parsing
**Timeline:** 2-3 days
**Goal:** Enable students to upload materials and extract content

### Deliverables
1. **Backend File Handling**
   - Upload endpoint validation
   - File type/size checking
   - Storage on filesystem
   - Status tracking (processing → analyzed)

2. **Document Processing**
   - PDF text extraction (pypdf)
   - DOCX parsing (python-docx)
   - TXT file handling
   - Page counting
   - Error handling for corrupted files

3. **Frontend Upload UI**
   - Drag-and-drop upload zone
   - File preview before upload
   - Upload progress indicator
   - Success/error messages
   - Real-time material list update

4. **Database Integration**
   - Save material metadata to PostgreSQL
   - Track upload timestamp, user, status
   - List materials endpoint
   - Delete material with cleanup

### Implementation Steps
1. Set up PostgreSQL database locally
2. Implement Material model and migration
3. Add upload route with validation
4. Create DocumentProcessor service
5. Build frontend upload component
6. Test end-to-end upload flow

### Acceptance Criteria
- ✅ Can upload PDF/DOCX/TXT files
- ✅ Files stored with metadata
- ✅ Materials list shows all uploads
- ✅ Can delete materials
- ✅ Text extracted correctly
- ✅ Page count accurate

---

## Phase 3: RAG Chat
**Timeline:** 3-4 days
**Goal:** Enable course-specific Q&A with retrieval-augmented generation

### Deliverables
1. **Vector Database Setup**
   - Initialize Chroma DB
   - Create collection for materials
   - Configure embeddings model (OpenAI)

2. **Document Chunking**
   - Split into fixed-size chunks with overlap
   - Preserve context between chunks
   - Clean and normalize text

3. **Embedding Pipeline**
   - Embed chunks using OpenAI API
   - Batch embed for efficiency
   - Store in Chroma with metadata

4. **Retrieval & Ranking**
   - Embed user query
   - Vector similarity search
   - Return top-5 relevant chunks
   - Track relevance scores

5. **LLM Generation**
   - Build context + prompt
   - Call GPT-4 with FE524 system prompt
   - Parse response and citations
   - Stream responses (future enhancement)

6. **Chat Persistence**
   - Save chats to database
   - Track user, query, response, sources
   - Build chat history endpoint
   - Support recent chat sidebar

### Implementation Steps
1. Initialize Chroma DB locally
2. Create RAGService with chunking logic
3. Implement embedding pipeline
4. Create PromptService with system prompts
5. Build chat route with full flow
6. Store chats in database
7. Create chat history endpoint
8. Build frontend chat interface

### API Endpoints
- `POST /api/chat` - Ask question
- `GET /api/chat/history` - Get history

### Acceptance Criteria
- ✅ Can ask FE524 questions
- ✅ Receives relevant, accurate answers
- ✅ Sources cited correctly
- ✅ Chat history saved and retrievable
- ✅ Answers grounded in materials
- ✅ Response time <2 seconds

---

## Phase 4: Study Tools
**Timeline:** 2-3 days
**Goal:** Generate study aids (summaries, flashcards, quizzes)

### Deliverables
1. **Lecture Summaries**
   - Extract key content from material
   - Generate 2-3 / 4-6 / 6-10 paragraph summaries
   - Extract 3-5 key takeaways
   - Identify important formulas

2. **Flashcard Generation**
   - Create question-answer pairs
   - Focus on key concepts and formulas
   - Output JSON for storage
   - Enable spaced repetition

3. **Quiz Generation**
   - Create multiple-choice questions
   - Generate 4 options per question
   - Mark correct answer
   - Provide explanations

### Implementation Steps
1. Create summary prompt template
2. Implement summary generation endpoint
3. Create flashcard prompt template
4. Implement flashcard endpoint
5. Create quiz prompt template
6. Implement quiz endpoint
7. Build frontend UI for each tool

### API Endpoints
- `POST /api/study/summary/{material_id}`
- `POST /api/study/flashcards/{material_id}`
- `POST /api/study/quiz/{material_id}`

### Acceptance Criteria
- ✅ Summaries are concise and accurate
- ✅ Flashcards are usable for review
- ✅ Quizzes test comprehension
- ✅ All generated content related to material
- ✅ JSON parsing works correctly

---

## Phase 5: Audio Features
**Timeline:** 2-3 days
**Goal:** Add voice interaction and audio output

### Deliverables
1. **Text-to-Speech**
   - Convert summaries to audio
   - Use OpenAI TTS API
   - Download and stream MP3
   - Enable playback in UI

2. **Speech-to-Text (Whisper)**
   - Capture microphone input
   - Send to OpenAI Whisper API (Phase 6)
   - Convert to text query
   - Send to chat endpoint

3. **Audio Answers**
   - Generate summaries with audio
   - Stream audio playback
   - Display transcription alongside

### Implementation Steps
1. Add TTS endpoint with OpenAI API
2. Build audio player component
3. Add microphone input component
4. Integrate Whisper (if not phase 6)
5. Store audio files with metadata
6. Enable audio replay of past conversations

### Acceptance Criteria
- ✅ Summaries convertible to audio
- ✅ Audio plays correctly in browser
- ✅ Microphone captures input
- ✅ Speech recognized accurately
- ✅ Audio answer flow end-to-end

---

## Phase 6: Polish & Polish
**Timeline:** 2-3 days
**Goal:** Refine UX, add persistence, polish interactions

### Deliverables
1. **Session Management**
   - Save chat sessions with name/timestamp
   - Resume previous sessions
   - Delete old sessions
   - Switch between sessions

2. **Better Citations**
   - Show excerpts from materials
   - Highlight relevant sections
   - Link to original PDF
   - Display page numbers

3. **UI Enhancements**
   - Loading states (spinners, skeletons)
   - Empty states (first time UX)
   - Error messages with recovery
   - Tooltips and help text
   - Responsive mobile layout

4. **Feedback System**
   - Thumbs up/down on answers
   - Flag incorrect information
   - Report bugs
   - Collect usage data

5. **Performance Optimization**
   - Code splitting and lazy loading
   - Image optimization
   - API response caching
   - Database query optimization

### Implementation Steps
1. Add session management to database
2. Implement session switching UI
3. Build loading/empty state components
4. Enhance citation display
5. Add feedback buttons
6. Optimize frontend bundle size
7. Add comprehensive error handling
8. Test on mobile devices

### Acceptance Criteria
- ✅ Sessions persist across browser refresh
- ✅ Loading states visible during API calls
- ✅ Empty states guide new users
- ✅ Citations show source material
- ✅ Mobile layout responsive
- ✅ Feedback collected successfully
- ✅ No console errors
- ✅ Page load time <2 seconds

---

## Priority Order for Implementation

### Must Have (MVP Core)
1. ✅ Phase 1: UI Foundation
2. Phase 2: File Upload & Parsing
3. Phase 3: RAG Chat

### Should Have (Complete Product)
4. Phase 4: Study Tools

### Nice to Have (Polish)
5. Phase 5: Audio Features
6. Phase 6: Polish

## Tech Setup Checklist

### Before Starting Phase 2
- [ ] PostgreSQL running locally (port 5432)
- [ ] Python 3.11+ installed
- [ ] Backend venv created
- [ ] requirements.txt installed
- [ ] .env file configured with OpenAI key
- [ ] Chroma DB initialized

### Before Starting Frontend Development
- [ ] Node.js 18+ installed
- [ ] npm dependencies installed (`npm install`)
- [ ] API URL configured in next.config.js
- [ ] Tailwind CSS working

## Testing Strategy

### Unit Tests
- Service functions (document processing, RAG)
- API route validators
- Frontend components

### Integration Tests
- End-to-end upload flow
- Chat with document retrieval
- Study tool generation

### User Acceptance Tests
- Upload various file types
- Ask variety of questions
- Generate all study tools
- Mobile experience

## Deployment Milestones

### Checkpoint 1: Phase 3 Complete
- Frontend + Backend fully functional
- Can upload documents and chat
- Ready for internal testing
- Deploy to staging server

### Checkpoint 2: Phase 4 Complete
- All core features implemented
- Study tools working
- Ready for beta users
- Deploy to production

### Checkpoint 3: Phase 6 Complete
- Polish complete
- Performance optimized
- Ready for full release
- Marketing materials ready
