"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function SignInPage() {
  const [email, setEmail] = useState('')

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        {/* Left: Branding / Copy */}
        <div className="hidden md:block">
          <div className="mb-6">
            <div className="w-16 h-16 gradient-blue rounded-xl flex items-center justify-center text-white font-bold text-2xl">Φ</div>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">GPTTutor</h1>
          <p className="text-lg text-gray-600 mb-6">
            Your AI study workspace for any course. Sign in to save progress, create courses,
            and turn materials into flashcards, quizzes, and summaries.
          </p>
          <ul className="space-y-3 text-gray-700">
            <li>• Upload PDFs and get instant summaries ✍️</li>
            <li>• Chat with your materials 💬</li>
            <li>• Generate flashcards & quizzes 🎓</li>
          </ul>
        </div>

        {/* Right: Sign In Card */}
        <div className="bg-white p-8 rounded-2xl shadow-md">
          <h2 className="text-2xl font-bold mb-2">Sign in to get started</h2>
          <p className="text-sm text-gray-500 mb-6">Use Google to create your account in seconds.</p>

          <button
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg py-3 mb-4 hover:shadow-sm transition"
            onClick={() => (window.location.href = `${backendUrl}/auth/google`)}
          >
            <Image src="/google.svg" alt="Google" width={20} height={20} />
            <span className="font-medium">Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 my-4">
            <hr className="flex-1 border-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <hr className="flex-1 border-gray-200" />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); window.location.href = '/onboarding' }}>
            <label className="text-sm text-gray-700">Email</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-2 mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              type="email"
              required
            />

            <button className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition">
              Continue with Email
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-4">By creating an account you agree to our <Link href="#" className="underline">Terms</Link> and <Link href="#" className="underline">Privacy Policy</Link>.</p>

          <div className="mt-6 text-center text-sm text-gray-500">
            Want a tour? <Link href="/landing" className="text-indigo-600 underline">See what GPTTutor can do</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
