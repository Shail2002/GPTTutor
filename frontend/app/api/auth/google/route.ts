import { NextResponse } from 'next/server'

export async function GET() {
  // Placeholder redirect — replace with real OAuth initiation endpoint or server-side route.
  const backendAuth = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
  const redirectUrl = `${backendAuth}/auth/google` // expected backend route to handle OAuth

  return NextResponse.redirect(redirectUrl)
}
