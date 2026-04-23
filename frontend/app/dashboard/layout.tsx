"use client"

import { useEffect, useState } from 'react'
import { PlusCircle } from 'lucide-react'

import { apiClient } from '../../lib/api'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const loadMe = async () => {
      try {
        const me = await apiClient.me()
        setUserName(me?.name || '')
        setUserEmail(me?.email || '')
      } catch {
        setUserName('')
        setUserEmail('')
      }
    }
    loadMe()
  }, [])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">FE524</h1>
          <p className="text-xs text-gray-500 mt-1">AI Tutor</p>
        </div>

        {/* New Button */}
        <div className="p-4">
          <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">
            <PlusCircle size={18} />
            New Study Session
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 px-2">MAIN</div>
          <NavItem href="/dashboard" icon="📊" label="Dashboard" active />
          <NavItem href="/chat" icon="💬" label="Tutor Chat" />
          <NavItem href="/materials" icon="📚" label="Materials" />

          <div className="text-xs font-semibold text-gray-500 px-2 mt-6">STUDY TOOLS</div>
          <NavItem href="/study/summaries" icon="✍️" label="Summaries" />
          <NavItem href="/study/flashcards" icon="🎓" label="Flashcards" />
          <NavItem href="/study/quiz" icon="❓" label="Quizzes" />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full"></div>
            <div>
              <div className="text-sm font-medium">{userName || 'Signed in'}</div>
              <div className="text-xs text-gray-500">{userEmail || '—'}</div>
            </div>
          </div>
          <button
            className="w-full text-left text-xs font-medium text-gray-600 hover:text-gray-900 py-2"
            onClick={async () => {
              try {
                // Clear cookies server-side.
                await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/logout`, {
                  method: 'POST',
                  credentials: 'include',
                })
              } finally {
                window.location.href = '/'
              }
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content */}
      {children}
    </div>
  )
}

function NavItem({
  href,
  icon,
  label,
  active = false,
  disabled = false,
}: {
  href: string
  icon: string
  label: string
  active?: boolean
  disabled?: boolean
}) {
  return (
    <a
      href={disabled ? undefined : href}
      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
        disabled
          ? 'text-gray-400 cursor-not-allowed'
          : active
            ? 'bg-indigo-50 text-indigo-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
      {disabled && <span className="ml-auto text-xs">(Coming)</span>}
    </a>
  )
}
