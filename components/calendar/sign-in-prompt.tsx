"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"

interface SignInPromptProps {
  onSignIn: () => void
}

export function SignInPrompt({ onSignIn }: SignInPromptProps) {
  return (
    <Card className="w-full h-full flex flex-col items-center justify-center text-center">
      <CardHeader>
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <CardTitle>Sign in to use Calendar</CardTitle>
        <CardDescription>
          Track your study sessions, manage tasks, and stay organized with our calendar features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onSignIn}>
          Sign In to Continue
        </Button>
      </CardContent>
    </Card>
  )
} 