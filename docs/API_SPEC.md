# FE524 AI Tutor - API Specification

Base URL: `http://localhost:8000/api`

## Authentication

All endpoints except `/auth/*` require Bearer token:
```
Authorization: Bearer <access_token>
```

## Health Check

### GET /health
Check service status

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

## Authentication Endpoints

### POST /auth/register
Register new user

**Request:**
```json
{
  "email": "student@columbia.edu",
  "password": "secure_password",
  "name": "Alex Chen"
}
```

**Response (201):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### POST /auth/login
Login existing user

**Request:**
```json
{
  "email": "student@columbia.edu",
  "password": "secure_password"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

## Materials Endpoints

### POST /materials/upload
Upload course material

**Request:** multipart/form-data
- `file`: PDF, DOCX, or TXT file (max 50MB)

**Response (201):**
```json
{
  "id": "mat_123abc",
  "name": "Lecture 12 - Stochastic Calculus",
  "status": "processing",
  "uploaded_at": "2024-01-15T10:30:00Z",
  "pages": 45,
  "size_mb": 2.4
}
```

### GET /materials
List all materials

**Query Parameters:**
- `limit`: int (default 50)
- `offset`: int (default 0)
- `status`: string (optional: processing, analyzed, failed)

**Response (200):**
```json
[
  {
    "id": "mat_123abc",
    "name": "Lecture 12 - Stochastic Calculus",
    "status": "analyzed",
    "uploaded_at": "2024-01-15T10:30:00Z",
    "pages": 45,
    "size_mb": 2.4
  }
]
```

### DELETE /materials/{material_id}
Delete material and embeddings

**Response (204):** No content

## Chat Endpoints

### POST /chat
Ask course-specific question with RAG

**Request:**
```json
{
  "query": "Explain Black-Scholes model in simple terms",
  "material_ids": ["mat_123abc"]
}
```

**Response (201):**
```json
{
  "id": "chat_456def",
  "query": "Explain Black-Scholes model in simple terms",
  "response": "The Black-Scholes model is a mathematical formula used to price options...",
  "sources": ["mat_123abc"],
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### GET /chat/history
Get chat history

**Query Parameters:**
- `limit`: int (default 50)

**Response (200):**
```json
[
  {
    "id": "chat_456def",
    "query": "Explain Black-Scholes model",
    "response": "The Black-Scholes model is...",
    "sources": ["mat_123abc"],
    "timestamp": "2024-01-15T10:35:00Z"
  }
]
```

## Study Tools Endpoints

### POST /study/summary/{material_id}
Generate lecture summary

**Request:**
```json
{
  "length": "medium"
}
```

Options: "short" (2-3 paragraphs), "medium" (4-6), "long" (6-10)

**Response (201):**
```json
{
  "id": "sum_789ghi",
  "material_id": "mat_123abc",
  "summary": "This lecture covers stochastic calculus...",
  "key_points": [
    "Key Point 1",
    "Key Point 2",
    "Key Point 3"
  ],
  "created_at": "2024-01-15T10:40:00Z"
}
```

### POST /study/flashcards/{material_id}
Generate flashcards

**Request:**
```json
{
  "count": 10
}
```

**Response (201):**
```json
{
  "id": "fc_012jkl",
  "material_id": "mat_123abc",
  "count": 10,
  "cards": [
    {
      "question": "What is the Black-Scholes model?",
      "answer": "A mathematical model for pricing financial options..."
    }
  ],
  "created_at": "2024-01-15T10:45:00Z"
}
```

### POST /study/quiz/{material_id}
Generate quiz

**Request:**
```json
{
  "questions": 5
}
```

**Response (201):**
```json
{
  "id": "quiz_345mno",
  "material_id": "mat_123abc",
  "questions": [
    {
      "question": "What does volatility measure in the Black-Scholes model?",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correct_answer": 1,
      "explanation": "The correct answer is B because..."
    }
  ],
  "created_at": "2024-01-15T10:50:00Z"
}
```

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Status Codes
- `200`: OK
- `201`: Created
- `204`: No Content
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `413`: Payload Too Large
- `500`: Internal Server Error

## Rate Limiting (To Implement)

- 100 requests/minute per user for general endpoints
- 10 requests/minute for expensive operations (chat, generation)
- 401 when rate limited

## Pagination (To Implement)

All list endpoints support:
- `limit`: Results per page (default 50, max 200)
- `offset`: Pagination offset (default 0)

Response includes:
```json
{
  "items": [...],
  "total": 123,
  "limit": 50,
  "offset": 0
}
```
