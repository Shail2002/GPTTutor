"use client"

import { useEffect, useState } from 'react'
import { apiClient, MaterialDTO, QuizDTO } from '../../../lib/api'

export default function QuizPage() {
  const [materials, setMaterials] = useState<MaterialDTO[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [questionsCount, setQuestionsCount] = useState(5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<QuizDTO | null>(null)
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
      const response = await apiClient.generateQuiz(selectedMaterialId, questionsCount)
      setResult(response)
    } catch {
      setError('Failed to generate quiz. Check backend logs and API key.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Quiz</h1>

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
            max={20}
            value={questionsCount}
            onChange={(e) => setQuestionsCount(Number(e.target.value))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
          />

          <button
            onClick={generate}
            disabled={!selectedMaterialId || isGenerating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400"
          >
            {isGenerating ? 'Generating...' : 'Generate Quiz'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        )}

        {result && (
          <div className="space-y-4">
            {result.questions.map((q, idx) => (
              <div key={`${idx}-${q.question.slice(0, 12)}`} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-gray-900 mb-3">{idx + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options?.map((opt, optIdx) => (
                    <div
                      key={`${idx}-${optIdx}`}
                      className={`px-3 py-2 rounded border ${
                        q.correct_answer === optIdx
                          ? 'bg-green-50 border-green-300 text-green-800'
                          : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}. {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="mt-3 text-sm text-gray-600"><strong>Why:</strong> {q.explanation}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
