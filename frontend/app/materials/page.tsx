"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, Filter, Trash2, Eye } from 'lucide-react'

import { apiClient, MaterialDTO } from '../../lib/api'

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<MaterialDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const data = await apiClient.getMaterials()
        setMaterials(data)
      } catch (error) {
        console.error('Failed to load materials', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMaterials()
  }, [])

  const upload = async (file: File) => {
    setIsUploading(true)
    try {
      const uploaded = await apiClient.uploadMaterial(file)
      setMaterials((prev) => [uploaded, ...prev])
    } catch (error) {
      console.error('Upload failed', error)
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await apiClient.deleteMaterial(id)
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch (error) {
      console.error('Delete failed', error)
      alert('Delete failed. Please try again.')
    }
  }

  const getType = (name: string) => {
    const ext = name.split('.').pop()?.toUpperCase()
    return ext || 'FILE'
  }

  const formatUploaded = (value: string) => {
    return new Date(value).toLocaleString()
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Course Materials</h1>
            <p className="text-gray-600 mt-1">Upload and manage FE524 course documents</p>
          </div>
          <label className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 cursor-pointer">
            <Upload size={20} />
            {isUploading ? 'Uploading...' : 'Upload File'}
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload(file)
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Filter size={16} />
            Filter
          </button>
          <select className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:border-gray-300">
            <option>Recently Uploaded</option>
            <option>Oldest First</option>
            <option>Alphabetical</option>
          </select>
        </div>

        {/* Materials List */}
        <div className="space-y-3">
          {!isLoading && materials.length === 0 && (
            <div className="academic-card p-6 text-sm text-gray-600">
              No files yet. Upload a lecture PDF or notes to begin.
            </div>
          )}
          {materials.map((material) => (
            <div key={material.id} className="academic-card p-4 flex items-center gap-4 group">
              <div className="p-3 bg-red-50 rounded-lg">
                <span className="text-lg">📄</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{material.name}</h4>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span>{getType(material.name)}</span>
                  <span>{material.size_mb.toFixed(2)} MB</span>
                  <span>{material.pages} pages</span>
                  <span>{formatUploaded(material.uploaded_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                  {material.status.toUpperCase()}
                </span>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="View">
                  <Eye size={18} className="text-gray-600" />
                </button>
                <button
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete"
                  onClick={() => remove(material.id)}
                >
                  <Trash2 size={18} className="text-gray-400 hover:text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Zone */}
        <div className="mt-12 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100">
          <Upload size={40} className="text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Drop files here or click to upload</h4>
          <p className="text-gray-600 mb-4">PDF, DOCX, or TXT files up to 50MB</p>
          <label className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer inline-block">
            Select Files
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload(file)
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
