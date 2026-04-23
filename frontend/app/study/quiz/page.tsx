"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trophy, Target, RotateCcw } from 'lucide-react'
import { apiClient, MaterialDTO, QuizDTO, StudyLevel } from '../../../lib/api'

const LEVEL_CONFIG: Record<StudyLevel, { label: string; target: number; defaultQuestions: number; description: string }> = {
  beginner: {
    label: 'Beginner',
    target: 20,
    defaultQuestions: 5,
    description: 'Foundational concepts and definitions.',
  },
  intermediate: {
    label: 'Intermediate',
    target: 30,
    defaultQuestions: 7,
    description: 'Applied reasoning with moderate complexity.',
  },
  advanced: {
    label: 'Advanced',
    target: 50,
    defaultQuestions: 10,
    description: 'Quant-heavy and scenario-based questions.',
  },
}

export default function QuizPage() {
  const [materials, setMaterials] = useState<MaterialDTO[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [level, setLevel] = useState<StudyLevel>('beginner')
  const [questionsCount, setQuestionsCount] = useState(LEVEL_CONFIG.beginner.defaultQuestions)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<QuizDTO | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
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
    setIsSubmitted(false)
    setSelectedAnswers({})
    try {
      const response = await apiClient.generateQuiz(selectedMaterialId, questionsCount, level)
      setResult(response)
    } catch {
      setError('Failed to generate quiz. Check backend logs and API key.')
    } finally {
      setIsGenerating(false)
    }
  }

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) return
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }))
  }

  const submitQuiz = () => {
    setIsSubmitted(true)
  }

  const resetQuiz = () => {
    setSelectedAnswers({})
    setIsSubmitted(false)
  }

  const totalQuestions = result?.questions.length ?? 0
  const attemptedQuestions = Object.keys(selectedAnswers).length
  const correctAnswers = result
    ? result.questions.reduce((count, q, idx) => (
      selectedAnswers[idx] === q.correct_answer ? count + 1 : count
    ), 0)
    : 0
  const scorePercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
  const currentLevel = LEVEL_CONFIG[level]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Quiz</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(LEVEL_CONFIG) as StudyLevel[]).map((moduleLevel) => {
            const config = LEVEL_CONFIG[moduleLevel]
            return (
              <button
                key={moduleLevel}
                type="button"
                onClick={() => {
                  setLevel(moduleLevel)
                  setQuestionsCount(config.defaultQuestions)
                  setResult(null)
                  setSelectedAnswers({})
                  setIsSubmitted(false)
                }}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  level === moduleLevel
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{config.label}</p>
                <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                <div className="mt-3 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  Target: {config.target}%
                </div>
              </button>
            )
          })}
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
            max={20}
            value={questionsCount}
            onChange={(e) => setQuestionsCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
          />

          <button
            onClick={generate}
            disabled={!selectedMaterialId || isGenerating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400"
          >
            {isGenerating ? 'Generating...' : `Generate ${currentLevel.label} Quiz`}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">Gamified Scoreboard</p>
                  <h2 className="text-xl font-bold text-gray-900">{currentLevel.label} Module</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Target</p>
                  <p className="text-2xl font-bold text-indigo-600">{currentLevel.target}%</p>
                </div>
              </div>
              <div className="mt-4 h-2.5 w-full rounded-full bg-gray-200">
                <div
                  className="h-2.5 rounded-full bg-indigo-600 transition-all"
                  style={{ width: `${Math.min(scorePercent, 100)}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-1 text-gray-700"><Target size={14} /> Attempted: {attemptedQuestions}/{totalQuestions}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-gray-900"><Trophy size={14} /> Score: {scorePercent}%</span>
              </div>
            </div>

            {result.questions.map((q, idx) => (
              <div key={`${idx}-${q.question.slice(0, 12)}`} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-gray-900 mb-3">{idx + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options?.map((opt, optIdx) => (
                    <button
                      type="button"
                      key={`${idx}-${optIdx}`}
                      onClick={() => selectAnswer(idx, optIdx)}
                      disabled={isSubmitted}
                      className={`px-3 py-2 rounded border ${
                        isSubmitted
                          ? q.correct_answer === optIdx
                            ? 'bg-green-50 border-green-300 text-green-800'
                            : selectedAnswers[idx] === optIdx
                              ? 'bg-red-50 border-red-300 text-red-800'
                              : 'border-gray-200 text-gray-700'
                          : selectedAnswers[idx] === optIdx
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}. {opt}
                    </button>
                  ))}
                </div>
                {isSubmitted && q.explanation && (
                  <p className="mt-3 text-sm text-gray-600"><strong>Why:</strong> {q.explanation}</p>
                )}
              </div>
            ))}

            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={submitQuiz}
                disabled={isSubmitted || attemptedQuestions !== totalQuestions}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg disabled:opacity-50"
              >
                Submit Quiz
              </button>
              <button
                type="button"
                onClick={resetQuiz}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <RotateCcw size={16} /> Try Again
              </button>
              {!isSubmitted && attemptedQuestions !== totalQuestions && (
                <p className="text-sm text-gray-500">Answer all questions before submitting.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
