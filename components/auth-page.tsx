"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserRegistration } from "./user-registration"
import { useState } from "react"
import { Mail } from "lucide-react"

export function AuthPage() {
  const [showAuth, setShowAuth] = useState(true)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">
            JEE Mains 2025 Prep Companion
          </h1>
          <div className="flex items-center gap-4">
            {!showAuth && (
              <Button 
                variant="outline"
                onClick={() => setShowAuth(true)}
              >
                Sign In to Compete
              </Button>
            )}
            <Button 
              variant="outline" 
              size="icon"
              asChild
            >
              <a href="mailto:notnikish@gmail.com">
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {showAuth ? (
          <UserRegistration />
        ) : (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold">
                    Continue Without Signing In
                  </h2>
                  <p className="text-muted-foreground">
                    You can use the app without signing in, but your data will only be saved locally. 
                    Sign in to:
                  </p>
                  <ul className="text-left list-disc list-inside space-y-2">
                    <li>Compete with other students on the leaderboard</li>
                    <li>Sync your data across devices</li>
                    <li>Track your long-term progress</li>
                    <li>Never lose your study data</li>
                  </ul>
                  <div className="pt-4">
                    <Button 
                      onClick={() => setShowAuth(true)}
                      className="w-full sm:w-auto"
                    >
                      Sign In to Get Started
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Created with ❤️ by Nikish • 
          <Button variant="link" size="sm" asChild>
            <a href="mailto:notnikish@gmail.com">Need Help?</a>
          </Button>
        </div>
      </footer>
    </div>
  )
} 