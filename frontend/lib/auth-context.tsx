"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import insforge from "@/lib/insforge"

interface User {
  id: string
  email?: string
  display_name?: string
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string; requireVerification?: boolean }>
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
  verifyEmail: (email: string, otp: string) => Promise<{ error?: string }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signInWithGoogle: async () => {},
  signInWithGithub: async () => {},
  signOut: async () => {},
  verifyEmail: async () => ({}),
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser()
      if (error || !data?.user) {
        setUser(null)
      } else {
        setUser({
          id: data.user.id,
          email: data.user.email,
          display_name: (data.user as any).display_name ?? (data.user as any).name,
          avatar_url: (data.user as any).avatar_url,
        })
      }
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      await refreshUser()
      if (!cancelled) setLoading(false)
    }
    hydrate()
    return () => { cancelled = true }
  }, [refreshUser])

  const signIn = async (email: string, password: string) => {
    const { error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    await refreshUser()
    return {}
  }

  const signUp = async (email: string, password: string, name?: string) => {
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name,
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) return { error: error.message }
    if (data?.requireEmailVerification) return { requireVerification: true }
    await refreshUser()
    return {}
  }

  const signInWithGoogle = async () => {
    await insforge.auth.signInWithOAuth("google", {
      redirectTo: `${window.location.origin}/login`,
    })
  }

  const signInWithGithub = async () => {
    await insforge.auth.signInWithOAuth("github", {
      redirectTo: `${window.location.origin}/login`,
    })
  }

  const signOut = async () => {
    await insforge.auth.signOut()
    setUser(null)
  }

  const verifyEmail = async (email: string, otp: string) => {
    const { error } = await insforge.auth.verifyEmail({ email, otp })
    if (error) return { error: error.message }
    await refreshUser()
    return {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signInWithGithub, signOut, verifyEmail, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
