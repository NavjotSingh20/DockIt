/**
 * useAuth.js
 * React hook for auth state — user, session, loading.
 * Works with Supabase Email OTP.
 */
import { useState, useEffect } from 'react'
import { supabase, onAuthStateChange } from '@/services/supabase'

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Subscribe to changes
    const unsub = onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return unsub
  }, [])

  const isAuthenticated = !!user

  return { user, session, loading, isAuthenticated }
}
