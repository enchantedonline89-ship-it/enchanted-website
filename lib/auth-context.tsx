'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseMockMode } from '@/lib/mock-data'

const MOCK_USER: User = {
  id: 'mock-user-id',
  email: 'test@enchanted.style',
  user_metadata: { full_name: 'Test User', avatar_url: null },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<string | null>
  signUpWithEmail: (email: string, password: string) => Promise<string | null>
  resetPassword: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
  mockSignIn: () => void  // only used in mock mode
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSupabaseMockMode()) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN') {
        const isAdmin = session?.user?.email?.toLowerCase() === 'enchantedonline89@gmail.com'
        const isAdminPath = typeof window !== 'undefined' &&
          window.location.pathname.startsWith('/admin')
        if (!isAdmin && !isAdminPath) {
          window.dispatchEvent(new CustomEvent('enchanted:welcome'))
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const signInWithEmail = async (email: string, password: string): Promise<string | null> => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? 'Invalid email or password.' : null
  }

  const signUpWithEmail = async (email: string, password: string): Promise<string | null> => {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    return error ? error.message : null
  }

  const resetPassword = async (email: string): Promise<string | null> => {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return error ? error.message : null
  }

  const signOut = async () => {
    if (isSupabaseMockMode()) { setUser(null); return }
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  const mockSignIn = () => setUser(MOCK_USER)

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, signOut, mockSignIn }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
