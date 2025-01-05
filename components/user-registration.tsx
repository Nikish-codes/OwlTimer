declare global {
  interface Window {
    validateTimeout: NodeJS.Timeout;
  }
}

"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirebase } from './firebase-provider'
import { useToast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog"

// Add validation functions
const validatePassword = (password: string) => {
  const errors = []
  if (password.length < 6) errors.push("Password must be at least 6 characters long")
  if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter")
  if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number")
  return errors
}

// Add a basic bad words list (you can expand this)
const badWords = [
  'fuck', 'shit', 'ass', 'bitch', 'dick', 'porn', 'sex',
  // Add more inappropriate words as needed
]

const validateUsername = (username: string) => {
  const errors = []
  
  // Check length
  if (username.length < 3) {
    errors.push("Username must be at least 3 characters long")
    return errors // Return early if too short
  }
  
  if (username.length > 20) {
    errors.push("Username must be less than 20 characters")
  }
  
  // Check characters
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push("Username can only contain letters, numbers, and underscores")
  }
  
  // Check for bad words
  const lowerUsername = username.toLowerCase()
  const containsBadWord = badWords.some(word => 
    lowerUsername.includes(word.toLowerCase())
  )
  
  if (containsBadWord) {
    errors.push("Username contains inappropriate content")
  }
  
  // Check if username starts with a number
  if (/^[0-9]/.test(username)) {
    errors.push("Username cannot start with a number")
  }
  
  return errors
}

const validateEmail = (email: string) => {
  const errors = []
  if (!email.includes('@')) errors.push("Please enter a valid email address")
  return errors
}

export function UserRegistration() {
  const { signUp, signIn, resetPassword } = useFirebase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  })
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // Add this function to validate form in real-time
  const validateForm = (data = formData) => {
    const errors = []
    
    if (data.email) {
      errors.push(...validateEmail(data.email))
    }
    
    if (data.username) {
      errors.push(...validateUsername(data.username))
    }
    
    // Add password validation
    if (data.password) {
      errors.push(...validatePassword(data.password))
    }
    
    if (data.password && data.confirmPassword) {
      if (data.password !== data.confirmPassword) {
        errors.push('Passwords do not match')
      }
    }
    
    setFormErrors(errors.filter(error => error !== ''))
    return errors
  }

  // Update form data and validate
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const newFormData = { ...formData, [name]: value }
    setFormData(newFormData)
    
    // Run validation immediately for password fields
    if (name === 'password' || name === 'confirmPassword') {
      validatePasswords(newFormData.password, newFormData.confirmPassword)
    } else {
      // For other fields, use debounced validation
      if (window.validateTimeout) {
        clearTimeout(window.validateTimeout)
      }
      window.validateTimeout = setTimeout(() => validateForm(newFormData), 500)
    }
  }

  // Add a separate password validation function
  const validatePasswords = (password: string, confirmPassword: string) => {
    const errors = []
    
    if (password) {
      errors.push(...validatePassword(password))
    }
    
    if (password && confirmPassword && password !== confirmPassword) {
      errors.push('Passwords do not match')
    }
    
    setFormErrors(errors.filter(error => error !== ''))
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validateForm()
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join('\n'),
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)
    try {
      await signUp(formData.email, formData.password, formData.username)
      toast({
        title: "Account created successfully!",
        description: "Please check your email for verification"
      })
    } catch (error: any) {
      // Handle Firebase specific errors
      let errorMessage = error.message
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email address is already registered. Please use a different email or try signing in.'
            break
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address'
            break
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password accounts are not enabled. Please contact support.'
            break
          case 'auth/weak-password':
            errorMessage = 'Please choose a stronger password'
            break
          default:
            // Handle custom errors from our signUp function
            if (error.message.includes('username is already taken')) {
              errorMessage = 'This username is already taken. Please choose a different username.'
            } else {
              errorMessage = error.message
            }
        }
      }
      
      // Show error in red under the relevant field
      if (errorMessage.includes('email')) {
        setFormErrors(prev => [...prev.filter(e => !e.includes('email')), errorMessage])
      } else if (errorMessage.includes('username')) {
        setFormErrors(prev => [...prev.filter(e => !e.includes('username')), errorMessage])
      } else {
        toast({
          title: "Error creating account",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(formData.email, formData.password)
      toast({
        title: "Signed in successfully!",
        description: "Welcome back!"
      })
    } catch (error: any) {
      let errorMessage = 'Failed to sign in'
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account exists with this email'
          setFormErrors(prev => [...prev.filter(e => !e.includes('email')), errorMessage])
          break
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password'
          setFormErrors(prev => [...prev.filter(e => !e.includes('password')), errorMessage])
          break
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later'
          toast({
            title: "Account Locked",
            description: errorMessage,
            variant: "destructive"
          })
          break
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled'
          toast({
            title: "Account Disabled",
            description: errorMessage,
            variant: "destructive"
          })
          break
        case 'auth/email-not-verified':
          errorMessage = 'Please verify your email before signing in'
          setFormErrors(prev => [...prev.filter(e => !e.includes('email')), errorMessage])
          break
        default:
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          })
      }
    } finally {
      setLoading(false)
    }
  }

  // Add password reset handler
  const handleResetPassword = async () => {
    if (!resetEmail) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive"
      })
      return
    }

    setResetLoading(true)
    try {
      await resetPassword(resetEmail)
      toast({
        title: "Password reset email sent",
        description: "Please check your inbox for further instructions",
        variant: "default"
      })
    } catch (error: any) {
      let errorMessage = 'Failed to send reset email'
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account exists with this email address'
          break
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address'
          break
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later'
          break
        default:
          errorMessage = 'Error sending reset email. Please try again'
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto mb-8">
      <CardHeader>
        <CardTitle>Welcome to JEE Prep Companion</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.some(e => e.toLowerCase().includes('email')) && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.find(e => e.toLowerCase().includes('email'))}
                  </p>
                )}
              </div>

              <div>
                <Input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.some(e => e.toLowerCase().includes('password') && !e.toLowerCase().includes('confirm')) && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.find(e => e.toLowerCase().includes('password') && !e.toLowerCase().includes('confirm'))}
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center">
                <Button type="submit" className="flex-1 mr-2" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" type="button">
                      Forgot Password?
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Password</AlertDialogTitle>
                      <AlertDialogDescription>
                        Enter your email address and we'll send you a password reset link.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Input
                        type="email"
                        placeholder="Email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleResetPassword}
                        disabled={resetLoading}
                      >
                        {resetLoading ? "Sending..." : "Send Reset Link"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.some(e => e.toLowerCase().includes('username')) && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.find(e => e.toLowerCase().includes('username'))}
                  </p>
                )}
              </div>
              
              <div>
                <Input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.some(e => e.toLowerCase().includes('email')) && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.find(e => e.toLowerCase().includes('email'))}
                  </p>
                )}
              </div>

              <div>
                <Input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.some(e => e.toLowerCase().includes('password') && !e.toLowerCase().includes('confirm')) && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.find(e => e.toLowerCase().includes('password') && !e.toLowerCase().includes('confirm'))}
                  </p>
                )}
              </div>

              <div>
                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.some(e => e.toLowerCase().includes('match')) && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.find(e => e.toLowerCase().includes('match'))}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || formErrors.length > 0}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

