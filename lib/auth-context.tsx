'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { authClient } from '@/lib/auth/client'

export type AuthUser = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  role?: string
}

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<string | null>
  signUpWithEmail: (email: string, password: string) => Promise<string | null>
  resetPassword: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function publicMessage(error: { message?: string; code?: string } | null): string | null {
  if (!error) return null
  if (error.code === 'EMAIL_NOT_VERIFIED') {
    return 'Verify your email before signing in. We sent you a fresh link.'
  }
  return error.message || 'That request could not be completed. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const user = (session?.user as AuthUser | undefined) ?? null

  const signInWithGoogle = async () => {
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: window.location.href,
      errorCallbackURL: `${window.location.origin}/?auth=1`,
    })
    if (error) throw new Error(publicMessage(error) ?? 'Google sign in failed')
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password })
    return publicMessage(error)
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const fallbackName = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'Customer'
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: fallbackName,
      callbackURL: window.location.href,
    })
    return publicMessage(error)
  }

  const resetPassword = async (email: string) => {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return publicMessage(error)
  }

  const signOut = async () => {
    await authClient.signOut()
    window.dispatchEvent(new CustomEvent('enchanted:signed-out'))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: isPending,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
