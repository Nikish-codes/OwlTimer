"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useFirebase } from "./firebase-provider"
import { useToast } from "./ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Settings2, LogOut, Mail, User } from "lucide-react"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


export function SettingsDialog() {
  const { user, signOut, updateUserProfile, updateUserPassword, sendVerificationEmail } = useFirebase()
  const { toast } = useToast()
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      })
    }
  }

  const handleUpdateProfile = async () => {
    if (!user) return
    setLoading(true)
    try {
        await updateUserProfile(newDisplayName)
      toast({
        title: "Profile updated",
        description: "Your display name has been updated successfully"
      })
    } catch (error) {
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
    if (!user || !newPassword) return
    setLoading(true)
    try {
        await updateUserPassword(newPassword)
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully"
      })
      setNewPassword('')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!user) return
    setLoading(true)
    try {
        await sendVerificationEmail()
      toast({
        title: "Verification email sent",
        description: "Please check your inbox"
      })
    } catch (error) {
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
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Settings
        </DialogTitle>
        <DialogDescription>
          Manage your account settings and preferences
        </DialogDescription>
      </DialogHeader>

      <Separator />

      {user && !user.emailVerified && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Email not verified</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Please verify your email address to ensure account security.</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResendVerification}
              disabled={loading}
            >
                Resend verification email

            </Button>
          </AlertDescription>
        </Alert>
      )}

        <div className="space-y-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium mb-4">Account Information</h3>
          <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Display Name</Label>
            <div className="flex gap-3">
            <div className="flex-1">
              <Input
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Enter new display name"
              />
            </div>
            <Button 
              onClick={handleUpdateProfile}
              disabled={loading || !newDisplayName || newDisplayName === user?.displayName}
            >
              Update
            </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <div className="flex gap-3">
            <div className="flex-1">
              <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              />
            </div>
            <Button 
              onClick={handleUpdatePassword}
              disabled={loading || !newPassword}
            >
              Update
            </Button>
            </div>
          </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button 
          variant="destructive" 
          onClick={handleLogout}
          className="flex items-center gap-2"
          disabled={loading}
          >
          <LogOut className="h-4 w-4" />
          Log out
          </Button>
        </div>
        </div>
      </div>
  )
}