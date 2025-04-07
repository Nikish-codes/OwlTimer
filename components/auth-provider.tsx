"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { User } from "firebase/auth"

interface AuthContextType {
	user: User | null
	logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null)

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged((user) => {
			setUser(user)
		})
		return () => unsubscribe()
	}, [])

	const logout = async () => {
		await auth.signOut()
	}

	return (
		<AuthContext.Provider value={{ user, logout }}>
			{children}
		</AuthContext.Provider>
	)
}

export const useAuth = () => useContext(AuthContext)