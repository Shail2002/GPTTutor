"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { apiClient } from '../../lib/api'

type Course = {
  name: string
  slug: string
  createdAt: string
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function loadCourses(): Course[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('gpttutor:courses')
    return raw ? (JSON.parse(raw) as Course[]) : []
  } catch {
    return []
  }
}

function saveCourses(courses: Course[]) {
  localStorage.setItem('gpttutor:courses', JSON.stringify(courses))
}

export default function OnboardingPage() {
  const router = useRouter()
  const [courseName, setCourseName] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [userName, setUserName] = useState<string>('')

  const suggested = useMemo(() => [
    'CS 101',
    'Financial Engineering',
    'Probability & Statistics',
    'Machine Learning',
  ], [])

  useEffect(() => {
    setCourses(loadCourses())
    ;(async () => {
      try {
        const me = await apiClient.me()
        setUserName(me?.name || '')
      } catch {
        // Not logged in -> back to sign-in
        router.replace('/')
      }
    })()
  }, [router])

  const createOrGo = (name: string) => {
    const slug = slugify(name)
    if (!slug) return

    const existing = courses.find((c) => c.slug === slug)
    const next = existing
      ? courses
      : [{ name: name.trim(), slug, createdAt: new Date().toISOString() }, ...courses]

    setCourses(next)
    saveCourses(next)
    localStorage.setItem('gpttutor:activeCourse', slug)
    router.push(`/c/${slug}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-sm text-slate-500">Welcome{userName ? `, ${userName}` : ''} 👋</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mt-1">
              Let’s set up your first course 🎯
            </h1>
            <p className="text-slate-600 mt-3">
              Create a course workspace to organize materials, chats, and study tools.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 shadow-sm">
            <span className="text-slate-600">📚</span>
            <span className="text-sm font-semibold text-slate-800">GPTTutor</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <label className="text-sm font-medium text-slate-700">Course name</label>
          <div className="mt-2 flex gap-3">
            <input
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g., FE524 Financial Engineering"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 transition"
              onClick={() => createOrGo(courseName)}
            >
              Continue →
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {suggested.map((s) => (
              <button
                key={s}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                onClick={() => createOrGo(s)}
              >
                {s} ✨
              </button>
            ))}
          </div>
        </div>

        {courses.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Your courses</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {courses.map((c) => (
                <button
                  key={c.slug}
                  className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition"
                  onClick={() => createOrGo(c.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900">{c.name}</div>
                    <div className="text-sm text-slate-500">➡️</div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">/c/{c.slug}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
