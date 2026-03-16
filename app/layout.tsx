import './globals.css'
import 'highlight.js/styles/github-dark.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aurion',
  description: 'AI-Powered App Builder',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="bg-[#0a0a0a] text-gray-100 min-h-screen">
        <main>{children}</main>
      </body>
    </html>
  );
}
