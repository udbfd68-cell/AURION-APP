import './globals.css'
import 'highlight.js/styles/github-dark.css'
import { Metadata } from 'next'

const hasClerk = !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export const metadata: Metadata = {
  title: 'Aurion',
  description: 'AI-Powered App Builder — Build production apps with natural language',
  openGraph: {
    title: 'Aurion — AI App Builder',
    description: 'Build production-ready apps with natural language. Deploy in one click.',
    type: 'website',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Only wrap with ClerkProvider when keys are configured
  if (hasClerk) {
    const { ClerkProvider } = await import('@clerk/nextjs');
    const { dark } = await import('@clerk/themes');
    return (
      <ClerkProvider
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: '#a855f7',
            colorBackground: '#111111',
            colorInputBackground: '#1a1a1a',
            colorInputText: '#ffffff',
          },
        }}
      >
        <html lang="en" suppressHydrationWarning>
          <head />
          <body className="bg-[#0a0a0a] text-gray-100 min-h-screen">
            <main>{children}</main>
          </body>
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="bg-[#0a0a0a] text-gray-100 min-h-screen">
        <main>{children}</main>
      </body>
    </html>
  );
}
