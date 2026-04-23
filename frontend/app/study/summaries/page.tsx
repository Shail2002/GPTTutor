"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, Loader2 } from 'lucide-react'
import { apiClient, MaterialDTO, SummaryDTO } from '../../../lib/api'

export default function SummariesPage() {
  const [materials, setMaterials] = useState<MaterialDTO[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [isGenerating, setIsGenerating] = useState(false)
  const [summary, setSummary] = useState<SummaryDTO | null>(null)
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')

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
      const response = await apiClient.generateSummary(selectedMaterialId, length)
      setSummary(response)
    } catch {
      setError('Failed to generate summary. Check backend logs and API key.')
    } finally {
      setIsGenerating(false)
    }
  }

  const playAudio = async () => {
    if (!summary) return
    setError('')
    setIsPlaying(true)
    try {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      const blob = await apiClient.textToSpeech(summary.summary)
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      const audio = new Audio(url)
      audio.play()
    } catch {
      setError('Failed to generate audio for this summary.')
    } finally {
      setIsPlaying(false)
    }
  }

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

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
          <h1 className="text-3xl font-bold text-gray-900">Summaries</h1>
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

          <select
            value={length}
            onChange={(e) => setLength(e.target.value as 'short' | 'medium' | 'long')}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>

          <button
            onClick={generate}
            disabled={!selectedMaterialId || isGenerating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400"
          >
            {isGenerating ? 'Generating...' : 'Generate Summary'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        )}

        {summary && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Summary Result</h2>
                <p className="text-sm text-gray-500">Created: {new Date(summary.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={playAudio}
                disabled={isPlaying}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg disabled:opacity-60"
              >
                {isPlaying ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {isPlaying ? 'Generating audio...' : 'Play Audio'}
              </button>
            </div>
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{summary.summary}</div>
            {summary.key_points.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Key Points</h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-1">
                  {summary.key_points.map((point, idx) => (
                    <li key={`${idx}-${point.slice(0, 12)}`}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
