"use client"

import { useEffect, useState } from 'react'
import { Upload, FileText, Clock, MoreVertical } from 'lucide-react'

import { apiClient, MaterialDTO } from '../../lib/api'

export default function DashboardPage() {
  const [uploadedMaterials, setUploadedMaterials] = useState<MaterialDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        try {
          const me = await apiClient.me()
          setUserName(me?.name || '')
        } catch {
          // Not logged in yet or auth not available.
          setUserName('')
        }
        const materials = await apiClient.getMaterials()
        setUploadedMaterials(materials.slice(0, 5))
      } catch (error) {
        console.error('Failed to load materials', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMaterials()
  }, [])

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const uploaded = await apiClient.uploadMaterial(file)
      setUploadedMaterials((prev) => [uploaded, ...prev].slice(0, 5))
    } catch (error) {
      console.error('Upload failed', error)
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const formatUploadedTime = (uploadedAt: string) => {
    const diffMs = Date.now() - new Date(uploadedAt).getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back{userName ? `, ${userName}` : ''}.
        </h1>
  <p className="text-gray-600 mt-1">Ready to keep learning? Pick up where you left off.</p>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Recent Materials */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Materials</h2>
            <a href="/materials" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
              View All
            </a>
          </div>

          <div className="space-y-3">
            {!isLoading && uploadedMaterials.length === 0 && (
              <div className="academic-card p-6 text-sm text-gray-600">
                No materials uploaded yet. Upload your first PDF to get started.
              </div>
            )}
            {uploadedMaterials.map((material) => (
              <div key={material.id} className="academic-card p-4 flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <FileText className="text-gray-400" size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{material.name}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatUploadedTime(material.uploaded_at)}
                    </span>
                    <span>{material.pages} pages</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    material.status === 'analyzed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {material.status.toUpperCase()}
                  </span>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload CTA */}
        <div className="mt-8 gradient-blue rounded-lg p-8 text-white text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Upload size={32} />
            </div>
          </div>
          <h3 className="text-xl font-bold">Upload Course Materials</h3>
          <p className="mt-2 opacity-90">
            Add PDFs, lecture notes, or research papers to get AI-powered insights and study tools
          </p>
          <label className="mt-4 inline-block px-6 py-2 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            {isUploading ? 'Uploading...' : 'Upload File'}
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
