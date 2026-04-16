'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, Brain, Zap, Users, BarChart3 } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-blue rounded-lg flex items-center justify-center text-white font-bold text-lg">
              Φ
            </div>
            <div>
              <h1 className="font-bold text-lg">FE524</h1>
              <p className="text-xs text-gray-600">AI Tutor</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-gray-700 hover:text-gray-900">
              Dashboard
            </a>
            <a href="/chat" className="text-sm text-gray-700 hover:text-gray-900">
              Chat
            </a>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-1 bg-blue-100 rounded-full">
            <span className="text-sm font-medium text-indigo-700">ACADEMIC EXCELLENCE</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Your AI Teaching Assistant for FE524
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Navigate complex course materials with an intelligent sanctuary designed for deep
            learning. Tailored to the FE524 curriculum with precision and clarity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              Start Learning
              <ArrowRight size={20} />
            </Link>
            <a
              href="#features"
              className="px-8 py-3 border border-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Demo/Screenshot */}
      <section className="px-6 py-12 bg-gray-50 rounded-2xl max-w-6xl mx-auto mb-20">
        <div className="aspect-video bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl border border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <Brain size={48} className="text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Dashboard Preview</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
            Master Your Curriculum
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-20">
            {/* Feature 1 */}
            <div className="academic-card p-8 flex gap-6">
              <div className="p-4 bg-indigo-100 rounded-lg h-fit">
                <BookOpen className="text-indigo-600" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Personalized Tutoring</h3>
                <p className="text-gray-600">
                  Our AI models are specifically fine-tuned on FE524 course content, providing
                  context-aware explanations that bridge the gap between theory and practice.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="academic-card p-8 flex gap-6">
              <div className="p-4 bg-purple-100 rounded-lg h-fit">
                <Zap className="text-purple-600" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Study Tools</h3>
                <p className="text-gray-600">
                  From auto-generated flashcards to AI-predicted exam questions, we provide a
                  suite of tools that turn passive reading into active recall.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="academic-card p-8 flex gap-6">
              <div className="p-4 bg-green-100 rounded-lg h-fit">
                <BarChart3 className="text-green-600" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Course Summaries</h3>
                <p className="text-gray-600">
                  Get instant bite-sized summaries of lengthy lectures and research papers.
                  Perfect for rapid review.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="academic-card p-8 flex gap-6">
              <div className="p-4 bg-pink-100 rounded-lg h-fit">
                <Users className="text-pink-600" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Course Summaries</h3>
                <p className="text-gray-600">
                  Get instant bite-sized summaries of lengthy lectures and research papers.
                  Perfect for rapid review.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Card */}
          <div className="gradient-blue rounded-2xl p-12 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">
              Ready to elevate your FE524 performance?
            </h3>
            <p className="text-lg opacity-90 mb-8">
              Join the new era of academic intelligence. Get started for free today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Create Free Account
              </Link>
              <button className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
                Talk to Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 py-12 mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 gradient-blue rounded-lg flex items-center justify-center text-white font-bold">
                  Φ
                </div>
                <div>
                  <p className="font-bold text-sm">FE524 AI Tutor</p>
                  <p className="text-xs text-gray-600">The intelligent sanctuary for higher learning</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Empowering students with precision-engineered AI support
              </p>
            </div>

            <div>
              <p className="font-semibold text-sm mb-3">RESOURCES</p>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 mb-2">
                Study Guides
              </a>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 mb-2">
                Course Map
              </a>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900">
                API Documentation
              </a>
            </div>

            <div>
              <p className="font-semibold text-sm mb-3">SUPPORT</p>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 mb-2">
                Help Center
              </a>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 mb-2">
                Contact Us
              </a>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900">
                Privacy Policy
              </a>
            </div>

            <div>
              <p className="font-semibold text-sm mb-3">LEGAL</p>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 mb-2">
                Terms of Service
              </a>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 mb-2">
                Privacy Policy
              </a>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              © 2024 FE524 AI Tutor. Built for excellence.
            </p>
            <div className="flex gap-4">
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">🌐</button>
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">💬</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
