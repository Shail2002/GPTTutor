"use client"

import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
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
  const [flipped, setFlipped] = useState<Record<number, boolean>>({})
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

  const generate = async () => {
    if (!selectedMaterialId) return
    setError('')
    setIsGenerating(true)
    setFlipped({})
    try {
      const response = await apiClient.generateFlashcards(selectedMaterialId, count, level)
      setResult(response)
    } catch {
      setError('Failed to generate flashcards. Check backend logs and API key.')
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleFlip = (index: number) => {
    setFlipped((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const resetFlips = () => setFlipped({})

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Flashcards</h1>

        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(LEVEL_COPY) as StudyLevel[]).map((moduleLevel) => (
            <button
              key={moduleLevel}
              type="button"
              onClick={() => {
                setLevel(moduleLevel)
                setResult(null)
                setFlipped({})
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
            onChange={(e) => setCount(Number(e.target.value))}
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
            onClick={resetFlips}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw size={16} /> Reset Cards
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        )}

        {result && (
          <div className="grid gap-4 md:grid-cols-2">
            {result.cards.map((card, idx) => (
              <button
                type="button"
                key={`${idx}-${card.question.slice(0, 12)}`}
                onClick={() => toggleFlip(idx)}
                className="h-56 w-full rounded-xl border border-gray-200 bg-white p-5 text-left transition-transform hover:-translate-y-0.5"
              >
                <p className="text-xs uppercase text-gray-500 mb-2">Card {idx + 1} • {LEVEL_COPY[level].label}</p>
                {!flipped[idx] ? (
                  <>
                    <p className="text-xs uppercase text-gray-500 mb-1">Question</p>
                    <p className="font-medium text-gray-900 line-clamp-6">{card.question}</p>
                    <p className="mt-4 text-xs text-indigo-600">Click to flip</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase text-gray-500 mb-1">Answer</p>
                    <p className="text-gray-700 line-clamp-6">{card.answer}</p>
                    <p className="mt-4 text-xs text-indigo-600">Click to flip back</p>
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
