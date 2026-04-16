import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FE524 AI Tutor',
  description: 'Course-specific AI teaching assistant for FE524 Financial Engineering',
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
      <body className="font-sans bg-white">{children}</body>
    </html>
  )
}
