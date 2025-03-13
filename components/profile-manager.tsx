"use client"

import { useState } from 'react'
import { useFirebase } from '@/components/firebase-provider'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function ProfileManager() {
  const { user, updateUserProfile, updateUserPassword, sendVerificationEmail } = useFirebase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [password, setPassword] = useState('')

  const handleUpdateProfile = async () => {
    setLoading(true)
    try {
      if (displayName !== user?.displayName) {
        await updateUserProfile(displayName)
        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    setLoading(true)
    try {
      if (password) {
        await updateUserPassword(password)
        toast({
          title: "Success",
          description: "Password updated successfully",
        })
        setPassword('')
      }
    } catch (error) {
      console.error("Error updating password:", error)
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendVerificationEmail = async () => {
    setLoading(true)
    try {
      await sendVerificationEmail()
      toast({
        title: "Success",
        description: "Verification email sent",
      })
    } catch (error) {
      console.error("Error sending verification email:", error)
      toast({
        title: "Error",
        description: "Failed to send verification email",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <Button onClick={handleUpdateProfile} disabled={loading}>
        Update Profile
      </Button>

      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button onClick={handleUpdatePassword} disabled={loading}>
        Update Password
      </Button>

      <Button onClick={handleSendVerificationEmail} disabled={loading}>
        Send Verification Email
      </Button>
    </div>
  )
} 
