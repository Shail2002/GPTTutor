# FE524 AI Tutor - Architecture Guide

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│                   (Next.js Frontend App)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / CORS                        │
│                   (FastAPI on :8000)                         │
├─────────────────────────────────────────────────────────────┤
│                      Application Layer                       │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │   Routes     │   Services   │   RAG Pipeline           │ │
│  │              │              │                          │ │
│  │ - /auth      │ - Auth       │ - Document Processing   │ │
│  │ - /materials │ - Materials  │ - Chunking              │ │
│  │ - /chat      │ - RAG        │ - Embedding (OpenAI)    │ │
│  │ - /study     │ - Study      │ - Vector Search         │ │
│  │              │ - Document   │ - LLM Prompting         │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Data Access Layer                         │
│  ┌──────────────────┬─────────────────┬──────────────────┐  │
│  │ PostgreSQL DB    │ Chroma Vector DB │ File Storage     │  │
│  │ (Metadata)       │ (Embeddings)     │ (Uploads)        │  │
│  │                  │                  │                  │  │
│  │ - Users          │ - Material Chunks│ - PDFs           │  │
│  │ - Materials      │ - Embeddings     │ - Documents      │  │
│  │ - Chats          │ - Collections    │ - Temp Files     │  │
│  │ - Study Tools    │                  │                  │  │
│  └──────────────────┴─────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────┐
        │     External Services (OpenAI)      │
        │  - GPT-4 (Completions)              │
        │  - Embeddings API                   │
        │  - Text-to-Speech (Future)          │
        └─────────────────────────────────────┘
```

## 📋 Data Flow

### Material Upload Flow
1. User uploads PDF via dashboard
2. File saved to local storage
3. Text extracted (pypdf, python-docx)
4. Document split into chunks
5. Chunks embedded via OpenAI
6. Embeddings stored in Chroma
7. Metadata stored in PostgreSQL
8. Status updated to "Analyzed"

### Chat Flow
1. User asks question in chat
2. Question embedded via OpenAI
3. Vector search retrieves relevant chunks
4. Context + question sent to GPT-4 with system prompt
5. Response generated with citations
6. Stored in chat history
7. Sent to frontend with sources

### Study Tools Flow
1. User selects material
2. Service generates specialized prompt
3. LLM generates content (summary/cards/quiz)
4. JSON parsed and structured
5. Stored in database
6. Sent to frontend for display

## 🗄️ Database Schema

### Users Table
```sql
- id (UUID primary key)
- email (unique)
- name
- hashed_password
- created_at
```

### Materials Table
```sql
- id (UUID primary key)
- user_id (foreign key)
- name (indexed)
- description
- file_path
- file_size_mb
- pages
- status (processing/analyzed/failed)
- uploaded_at
- processed_at
```

### Chats Table
```sql
- id (UUID primary key)
- user_id (foreign key)
- query (full text)
- response (full text)
- sources (JSON: [material_id, ...])
- created_at
```

### Summaries Table
```sql
- id (UUID primary key)
- user_id (foreign key)
- material_id (foreign key)
- summary (text)
- key_points (JSON: [point, ...])
- created_at
```

### Flashcards Table
```sql
- id (UUID primary key)
- user_id (foreign key)
- material_id (foreign key)
- question
- answer
- created_at
```

### Quizzes Table
```sql
- id (UUID primary key)
- user_id (foreign key)
- material_id (foreign key)
- questions (JSON: [{question, options, answer}, ...])
- created_at
```

## 🔑 Key Design Decisions

### 1. Modular Architecture
- Separate concerns: routes, services, models
- Easy to extend and test
- Clear dependencies

### 2. RAG with Chroma + OpenAI
- Simple to deploy (local Chroma)
- Scales with PostgreSQL metadata
- OpenAI handles intelligent retrieval and generation

### 3. Chunking Strategy
- Fixed chunk size with overlap
- Preserves context across splits
- Tunable hyperparameters

### 4. Course-Specific Prompts
- System prompt establishes tutor role
- Specialized prompts for each tool type
- Consistent, high-quality outputs

### 5. Stateless API Design
- Each request fully specified
- Enables horizontal scaling
- Clean separation of concerns

## 🚀 Scalability Considerations

### Phase 1: Single Instance
- Backend on one machine
- Local Chroma DB
- PostgreSQL on localhost or separate server
- Suitable for MVP with <100 students

### Phase 2: Distributed (100-1000 students)
- Backend instances behind load balancer
- PostgreSQL with replicas
- Chroma replicated across nodes
- File storage on S3

### Phase 3: Enterprise (1000+ students)
- Kubernetes orchestration
- Distributed vector DB (Milvus/Weaviate)
- Caching layer (Redis)
- CDN for frontend
- Multi-region deployment

## 🔐 Security Considerations

1. **API Authentication**: JWT tokens (to implement in Phase 1)
2. **File Validation**: Verify file types, check for malware
3. **Access Control**: Users can only access own materials
4. **Rate Limiting**: Prevent abuse of OpenAI API
5. **Input Sanitization**: Clean all user inputs
6. **CORS**: Restrict to frontend domain

## 📊 Performance Targets

- Material upload: <5s for 50MB PDF
- Chat response: <2s (including retrieval + LLM)
- Vector search: <200ms for top-5 results
- Flashcard generation: <5s

## 🔄 Deployment Pipeline

1. **Development**: Run locally with pip + npm
2. **Staging**: Docker containers in staging environment
3. **Production**: Kubernetes with Helm charts
4. **Monitoring**: Logs, metrics, error tracking (New Relic/DataDog)
