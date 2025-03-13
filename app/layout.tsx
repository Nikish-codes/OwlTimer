import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"
import { FirebaseProvider } from '@/components/firebase-provider'
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from '@/components/error-boundary'
import { TimerProvider } from '@/components/study-timer-provider'
import { AudioStateProvider } from '@/components/audio-state-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Exam Pomodoro Timer',
  description: 'The Best Timer for Your Exams',
  verification: {
    google: 'Kq-mj_SJ7u4zk4xWo9UF6Zwm_bCKALwke6clGEJiiA0',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <FirebaseProvider>
              <AudioStateProvider>
                <TimerProvider>
                  {children}
                </TimerProvider>
              </AudioStateProvider>
            </FirebaseProvider>
          </ThemeProvider>
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  )
}

