"use client"

import { useEffect, useState } from 'react'
import { apiClient, FlashcardSetDTO, MaterialDTO } from '../../../lib/api'

export default function FlashcardsPage() {
  const [materials, setMaterials] = useState<MaterialDTO[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [count, setCount] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<FlashcardSetDTO | null>(null)
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
    try {
      const response = await apiClient.generateFlashcards(selectedMaterialId, count)
      setResult(response)
    } catch {
      setError('Failed to generate flashcards. Check backend logs and API key.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Flashcards</h1>

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
            {isGenerating ? 'Generating...' : 'Generate Flashcards'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        )}

        {result && (
          <div className="space-y-3">
            {result.cards.map((card, idx) => (
              <div key={`${idx}-${card.question.slice(0, 12)}`} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs uppercase text-gray-500 mb-2">Question {idx + 1}</p>
                <p className="font-medium text-gray-900">{card.question}</p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs uppercase text-gray-500 mb-1">Answer</p>
                  <p className="text-gray-700">{card.answer}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
