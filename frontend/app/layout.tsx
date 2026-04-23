import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GPTTutor',
  description: 'AI tutoring workspace for any course — chat with your materials, generate study tools, and track progress.',
  icons: {
    icon: [{ url: '/favicon.ico' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
  <body className="font-sans bg-white text-slate-900">{children}</body>
    </html>
  )
}
