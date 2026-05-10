// API Client Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface MaterialDTO {
  id: string
  name: string
  status: string
  uploaded_at: string
  pages: number
  size_mb: number
}

export interface ChatRequest {
  query: string
  material_ids?: string[]
}

export interface ChatResponse {
  id: string
  query: string
  response: string
  sources: string[]
  timestamp: string
}

export interface SummaryDTO {
  id: string
  material_id: string
  summary: string
  key_points: string[]
  created_at: string
}

export interface FlashcardSetDTO {
  id: string
  material_id: string
  count: number
  cards: Array<{ question: string; answer: string }>
  created_at: string
}

export interface QuizDTO {
  id: string
  material_id: string
  questions: Array<{
    question: string
    options: string[]
    correct_answer: number
    explanation?: string
  }>
  created_at: string
}

export interface AudioTranscriptionDTO {
  text: string
  language?: string | null
}

export type StudyLevel = 'beginner' | 'intermediate' | 'advanced'

export class APIClient {
  private baseURL: string

  constructor(baseURL = API_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const response = await fetch(url, {
  credentials: 'include',
  cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Auth
  async register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async me() {
    return this.request<{ name: string; email?: string | null }>('/api/auth/me')
  }

  // Materials
  async uploadMaterial(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/api/materials/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    return response.json()
  }

  async getMaterials() {
    return this.request<MaterialDTO[]>('/api/materials')
  }

  async deleteMaterial(id: string) {
    return this.request(`/api/materials/${id}`, {
      method: 'DELETE',
    })
  }

  // Chat / RAG
  async chat(request: ChatRequest) {
    return this.request<ChatResponse>('/api/chat/', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getChatHistory(limit: number = 50) {
    return this.request<ChatResponse[]>(`/api/chat/history?limit=${limit}`)
  }

  // Study Tools
  async generateSummary(materialId: string, length: 'short' | 'medium' | 'long' = 'medium') {
    return this.request<SummaryDTO>(`/api/study/summary/${materialId}`, {
      method: 'POST',
      body: JSON.stringify({ length }),
    })
  }

  async generateFlashcards(materialId: string, count = 10, level: StudyLevel = 'beginner') {
    return this.request<FlashcardSetDTO>(`/api/study/flashcards/${materialId}`, {
      method: 'POST',
      body: JSON.stringify({ count, level }),
    })
  }

  async generateQuiz(materialId: string, questions = 5, level: StudyLevel = 'beginner') {
    return this.request<QuizDTO>(`/api/study/quiz/${materialId}`, {
      method: 'POST',
      body: JSON.stringify({ questions, level }),
    })
  }

  // Audio
  async textToSpeech(text: string, voice = 'alloy') {
    const response = await fetch(`${this.baseURL}/api/audio/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voice }),
  credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.status} ${response.statusText}`)
    }

    return response.blob()
  }

  async textToSpeechElevenLabs(text: string) {
    const response = await fetch(`${this.baseURL}/api/audio/tts/elevenlabs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS failed: ${response.status} ${response.statusText}`)
    }

    return response.blob()
  }

  async transcribeAudio(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/api/audio/transcribe`, {
      method: 'POST',
      body: formData,
  credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<AudioTranscriptionDTO>
  }
}

export const apiClient = new APIClient()
export default apiClient
