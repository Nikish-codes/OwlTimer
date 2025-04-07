import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"
import { FirebaseProvider } from '@/components/firebase-provider'
import { AuthProvider } from '@/components/auth-provider'
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from '@/components/error-boundary'
import { TimerProvider } from "@/providers/timer-provider"

const inter = Inter({ subsets: ['latin'] })

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
              <AuthProvider>
                <TimerProvider>
                  {children}
                  <Toaster />
                </TimerProvider>
              </AuthProvider>
            </FirebaseProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

