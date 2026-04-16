"use client"

import { Send, Plus, Smile, Paperclip, Zap, Loader, Trash2, ThumbsUp, ThumbsDown, Mic, MicOff } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import apiClient from '../../lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: string[]
  feedback?: 'up' | 'down'
}

interface Material {
  id: string
  name: string
}

interface ChatSession {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  messages: Message[]
  selectedMaterialIds: string[]
}

function createSessionName(messages: Message[]) {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return 'New Session'
  const text = firstUser.content.trim()
  return text.length > 32 ? `${text.slice(0, 32)}...` : text
}

function newSession(): ChatSession {
  const now = new Date().toISOString()
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: 'New Session',
    createdAt: now,
    updatedAt: now,
    messages: [],
    selectedMaterialIds: [],
  }
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [attachmentName, setAttachmentName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const emojiOptions = ['😀', '😊', '🧠', '📌', '✍️', '📚', '🎯', '✨']

  // Initialize chat session and materials. Chat is intentionally in-memory only.
  useEffect(() => {
    const loadData = async () => {
      const initial = newSession()
      setSessions([initial])
      setActiveSessionId(initial.id)
      setMessages(initial.messages)
      setSelectedMaterialIds(initial.selectedMaterialIds)

      try {
        const mats = await apiClient.getMaterials()
        setMaterials(mats)
      } catch (error) {
        console.error('Failed to load materials:', error)
      }
    }

    loadData()
  }, [])

  // Keep active session in sync with message and filter changes.
  useEffect(() => {
    if (!activeSessionId) return
    setSessions((prev) => prev.map((session) => {
      if (session.id !== activeSessionId) return session
      return {
        ...session,
        name: createSessionName(messages),
        updatedAt: new Date().toISOString(),
        messages,
        selectedMaterialIds,
      }
    }))
  }, [messages, selectedMaterialIds, activeSessionId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const createChatSession = () => {
    const session = newSession()
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
    setMessages([])
    setSelectedMaterialIds([])
    setAttachmentName('')
  }

  const switchSession = (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId)
    if (!target) return
    setActiveSessionId(target.id)
    setMessages(target.messages)
    setSelectedMaterialIds(target.selectedMaterialIds)
    setAttachmentName('')
  }

  const deleteSession = (sessionId: string) => {
    const remaining = sessions.filter((s) => s.id !== sessionId)
    if (remaining.length === 0) {
      const fresh = newSession()
      setSessions([fresh])
      setActiveSessionId(fresh.id)
      setMessages([])
      setSelectedMaterialIds([])
      return
    }

    setSessions(remaining)
    if (activeSessionId === sessionId) {
      const next = remaining[0]
      setActiveSessionId(next.id)
      setMessages(next.messages)
      setSelectedMaterialIds(next.selectedMaterialIds)
    }
  }

  const setMessageFeedback = (messageId: string, feedback: 'up' | 'down') => {
    setMessages((prev) => prev.map((m) => (
      m.id === messageId ? { ...m, feedback: m.feedback === feedback ? undefined : feedback } : m
    )))
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    // Add user message
    const userMessageId = Date.now().toString()
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Call chat API
      const response = await apiClient.chat({
        query: input,
        material_ids: selectedMaterialIds.length > 0 ? selectedMaterialIds : undefined,
      })

      // Add assistant message
      const assistantMessage: Message = {
        id: response.id,
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: response.sources,
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, errorMessage])
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleMaterial = (materialId: string) => {
    setSelectedMaterialIds(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    )
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setAttachmentName(file.name)
    try {
      const uploaded = await apiClient.uploadMaterial(file)
      setMaterials(prev => [uploaded, ...prev.filter(m => m.id !== uploaded.id)])
    } catch (error) {
      console.error('Attachment upload failed:', error)
      alert('Attachment upload failed. Please try again.')
      setAttachmentName('')
    } finally {
      setIsUploading(false)
    }
  }

  const insertEmoji = (emoji: string) => {
    setInput(prev => `${prev}${emoji}`)
    setShowEmojiPicker(false)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recordedChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        setIsTranscribing(true)
        try {
          const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
          const audioFile = new File([audioBlob], 'question.webm', { type: 'audio/webm' })
          const result = await apiClient.transcribeAudio(audioFile)
          setInput(result.text)
        } catch (error) {
          console.error('Transcription failed:', error)
          alert('Transcription failed. Please type your question instead.')
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setShowEmojiPicker(false)
    } catch (error) {
      console.error('Recording failed:', error)
      alert('Microphone access is required for voice input.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const showDictationStatus = isRecording
    ? 'Recording...'
    : isTranscribing
      ? 'Transcribing...'
      : ''

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">FE524 Tutor Chat</h1>
          <p className="text-sm text-gray-500">Ask questions about your course materials</p>
        </div>
        <button
          type="button"
          onClick={createChatSession}
          className="inline-flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
          title="New session"
        >
          <Plus size={20} />
          New Chat
        </button>
      </div>

      {/* Session tabs */}
      <div className="bg-white border-b border-gray-100 px-6 py-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {sessions.map((session) => (
            <div key={session.id} className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => switchSession(session.id)}
                className={`px-3 py-1.5 text-xs rounded-full ${
                  activeSessionId === session.id ? 'bg-indigo-600 text-white' : 'text-gray-700'
                }`}
              >
                {session.name}
              </button>
              <button
                type="button"
                onClick={() => deleteSession(session.id)}
                className="px-2 py-1 text-gray-500 hover:text-red-600"
                title="Delete session"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <Zap size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">Start a conversation</p>
              <p className="text-gray-400 text-sm mt-2">
                {materials.length === 0
                  ? 'Upload course materials to begin'
                  : 'Ask anything about FE524'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none'
                      : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-none'
                  } px-4 py-3`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300/20 text-xs opacity-75">
                      📌 {message.sources.join(', ')}
                    </div>
                  )}
                  <div
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'opacity-70' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp}
                  </div>
                  {message.role === 'assistant' && (
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setMessageFeedback(message.id, 'up')}
                        className={`inline-flex items-center gap-1 text-xs ${
                          message.feedback === 'up' ? 'text-green-700' : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp size={12} />
                        Helpful
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessageFeedback(message.id, 'down')}
                        className={`inline-flex items-center gap-1 text-xs ${
                          message.feedback === 'down' ? 'text-red-700' : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Not helpful"
                      >
                        <ThumbsDown size={12} />
                        Not helpful
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-none px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader size={16} className="animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-8 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Material filter */}
          {materials.length > 0 && (
            <div className="mb-3 flex gap-2 flex-wrap">
              <span className="text-xs text-gray-500 self-center">Filter by materials:</span>
              {materials.map((material) => (
                <button
                  key={material.id}
                  onClick={() => toggleMaterial(material.id)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedMaterialIds.includes(material.id)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {material.name.split('.')[0]}
                </button>
              ))}
            </div>
          )}

          {attachmentName && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
              <span>Attached:</span>
              <span className="font-medium">{attachmentName}</span>
              {isUploading && <span className="opacity-70">(uploading...)</span>}
            </div>
          )}

          {showDictationStatus && (
            <div className="mb-3 text-xs text-gray-500">{showDictationStatus}</div>
          )}

          {/* Input area */}
          <div className="flex gap-3 mb-3">
            <button
              type="button"
              onClick={handleAttachmentClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Attach file"
              disabled={isUploading}
            >
              <Paperclip size={20} />
            </button>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={`p-2 rounded-lg transition-colors ${
                isRecording ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'hover:bg-gray-100 text-gray-600'
              } disabled:opacity-60`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(prev => !prev)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Emoji"
            >
              <Smile size={20} />
            </button>
            <div className="flex-1"></div>
          </div>

          {showEmojiPicker && (
            <div className="mb-3 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="h-9 w-9 rounded-md border border-gray-200 text-lg hover:bg-gray-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                void handleFileUpload(file)
              }
              e.currentTarget.value = ''
            }}
          />
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              placeholder="Ask anything about FE524..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
