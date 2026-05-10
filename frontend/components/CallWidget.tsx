"use client"

import { useMemo, useState } from 'react'
import { Loader2, Phone } from 'lucide-react'

export default function CallWidget() {
  const [open, setOpen] = useState(false)
  const [isCalling, setIsCalling] = useState(false)
  const [error, setError] = useState('')

  const quickNumber = '+1 (551) 444 0327'

  const canCall = useMemo(() => !isCalling, [isCalling])

  const requestCall = async () => {
    setError('')
    setIsCalling(true)
    try {
      const activeCourse = localStorage.getItem('gpttutor:activeCourse') || ''

      // MVP: call initiation endpoint (Twilio/Vapi/etc.) should live on the backend.
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const resp = await fetch(`${baseUrl}/api/calls/outbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone_number: quickNumber,
          course_slug: activeCourse,
        }),
      })

      if (!resp.ok) {
        let detail = ''
        try {
          const json = await resp.json()
          detail = json?.detail ? String(json.detail) : ''
        } catch {
          // ignore
        }
        throw new Error(detail || `Call request failed: ${resp.status} ${resp.statusText}`)
      }

  setOpen(false)
    } catch (e: any) {
      setError(e?.message || 'Failed to generate voice')
    } finally {
      setIsCalling(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
  aria-label="Request a live call"
      >
        <Phone size={18} />
        <span className="hidden sm:inline text-sm font-semibold">Call</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-200 p-5 m-0 sm:m-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Live call</h3>
                <p className="text-xs text-gray-500 mt-1">
                  If you have any doubts or book prof. office hours - Call us here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {error && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={requestCall}
                disabled={!canCall}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {isCalling ? <Loader2 className="animate-spin" size={16} /> : <Phone size={16} />}
                {isCalling ? 'Requesting…' : `Call ${quickNumber}`}
              </button>

              <p className="text-[11px] text-gray-500">
                We’ll use your current course context to route the call. Standard carrier rates may apply.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
