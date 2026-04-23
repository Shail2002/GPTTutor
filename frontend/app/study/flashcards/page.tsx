"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Shuffle,
  X,
} from 'lucide-react'
import { apiClient, FlashcardSetDTO, MaterialDTO, StudyLevel } from '../../../lib/api'

const LEVEL_COPY: Record<StudyLevel, { label: string; description: string }> = {
  beginner: {
    label: 'Beginner',
    description: 'Build core FE524 vocabulary and foundational formulas.',
  },
  intermediate: {
    label: 'Intermediate',
    description: 'Reinforce applied problem-solving concepts.',
  },
  advanced: {
    label: 'Advanced',
    description: 'Master rigorous quantitative reasoning and edge cases.',
  },
}

export default function FlashcardsPage() {
  const [materials, setMaterials] = useState<MaterialDTO[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [level, setLevel] = useState<StudyLevel>('beginner')
  const [count, setCount] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<FlashcardSetDTO | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [knownCards, setKnownCards] = useState<Record<number, boolean>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.getMaterials()
        setMaterials(data)
        if (data.length > 0) {
          setSelectedMaterialId(data[0].id)
        }
      } catch {
        setError('Failed to load materials')
      }
    }
    load()
  }, [])

  const cards = result?.cards ?? []
  const currentCard = cards[currentIndex]
  const masteredCount = Object.values(knownCards).filter(Boolean).length
  const progressPercent = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0

  const resetSession = () => {
    setIsFlipped(false)
    setCurrentIndex(0)
    setKnownCards({})
  }

  const generate = async () => {
    if (!selectedMaterialId) return
    setError('')
    setIsGenerating(true)
    resetSession()
    try {
      const response = await apiClient.generateFlashcards(selectedMaterialId, count, level)
      setResult(response)
    } catch {
      setError('Failed to generate flashcards. Check backend logs and API key.')
    } finally {
      setIsGenerating(false)
    }
  }

  const goToCard = (index: number) => {
    if (cards.length === 0) return
    const nextIndex = (index + cards.length) % cards.length
    setCurrentIndex(nextIndex)
    setIsFlipped(false)
  }

  const markCard = (isKnown: boolean) => {
    setKnownCards((prev) => ({ ...prev, [currentIndex]: isKnown }))
    if (currentIndex < cards.length - 1) {
      goToCard(currentIndex + 1)
    }
  }

  const shuffleCards = () => {
    if (!result || cards.length < 2) return
    const shuffled = [...cards]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }
    setResult({ ...result, cards: shuffled })
    resetSession()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Flashcards</h1>
          </div>
          {result && (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700">
              Mastered <span className="font-semibold text-gray-900">{masteredCount}</span> of{' '}
              <span className="font-semibold text-gray-900">{cards.length}</span>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(LEVEL_COPY) as StudyLevel[]).map((moduleLevel) => (
            <button
              key={moduleLevel}
              type="button"
              onClick={() => {
                setLevel(moduleLevel)
                setResult(null)
                resetSession()
              }}
              className={`rounded-xl border p-4 text-left transition-colors ${
                level === moduleLevel
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">{LEVEL_COPY[moduleLevel].label}</p>
              <p className="mt-1 text-xs text-gray-500">{LEVEL_COPY[moduleLevel].description}</p>
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
          <select
            value={selectedMaterialId}
            onChange={(e) => setSelectedMaterialId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {materials.length === 0 && <option value="">No materials uploaded</option>}
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            max={30}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
          />

          <button
            onClick={generate}
            disabled={!selectedMaterialId || isGenerating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400"
          >
            {isGenerating ? 'Generating...' : `Generate ${LEVEL_COPY[level].label} Flashcards`}
          </button>

          <button
            type="button"
            onClick={resetSession}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw size={16} /> Reset Session
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        )}

        {result && currentCard && (
          <div className="space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Card {currentIndex + 1} of {cards.length}
                  </p>
                  <p className="text-xs text-gray-500">{LEVEL_COPY[level].label} study mode</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={shuffleCards}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Shuffle size={15} />
                    Shuffle
                  </button>
                  <button
                    type="button"
                    onClick={resetSession}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <RotateCcw size={15} />
                    Restart
                  </button>
                </div>
              </div>

              <div className="mb-5 h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-indigo-600 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsFlipped((prev) => !prev)}
                className={`flex min-h-80 w-full items-center justify-center rounded-xl border p-8 text-center shadow-sm transition-all hover:-translate-y-0.5 ${
                  isFlipped
                    ? 'border-indigo-200 bg-indigo-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <span>
                  <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-gray-500">
                    <Eye size={14} />
                    {isFlipped ? 'Answer' : 'Question'}
                  </span>
                  <span className="block text-xl font-semibold leading-relaxed text-gray-900 md:text-2xl">
                    {isFlipped ? currentCard.answer : currentCard.question}
                  </span>
                  <span className="mt-6 block text-sm font-medium text-indigo-600">
                    Click card to {isFlipped ? 'show question' : 'reveal answer'}
                  </span>
                </span>
              </button>

              <div className="mt-5 grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
                <button
                  type="button"
                  onClick={() => goToCard(currentIndex - 1)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => markCard(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <X size={17} />
                    Still learning
                  </button>
                  <button
                    type="button"
                    onClick={() => markCard(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <Check size={17} />
                    Know it
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => goToCard(currentIndex + 1)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {cards.map((card, idx) => (
                <button
                  type="button"
                  key={`${idx}-${card.question.slice(0, 12)}`}
                  onClick={() => goToCard(idx)}
                  className={`flex items-center justify-between gap-3 rounded-lg border bg-white p-4 text-left text-sm transition-colors ${
                    idx === currentIndex ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <span className="min-w-0 truncate text-gray-800">
                    {idx + 1}. {card.question}
                  </span>
                  {knownCards[idx] === true && <Check size={16} className="shrink-0 text-emerald-600" />}
                  {knownCards[idx] === false && <ArrowRight size={16} className="shrink-0 text-rose-500" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
