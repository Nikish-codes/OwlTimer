import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { toast } from '@/components/ui/use-toast'

export async function signIn() {
  const auth = getAuth()
  const provider = new GoogleAuthProvider()
  
  try {
    await signInWithPopup(auth, provider)
    toast({
      title: "Signed in successfully"
    })
  } catch (error) {
    console.error('Sign in error:', error)
    toast({
      title: "Sign in failed",
      description: "Please try again",
      variant: "destructive"
    })
  }
} 