import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — ignore cookie setting errors
          }
        },
      },
    }
  )
}

/**
 * Service-role client. Server only, genuinely bypasses RLS.
 *
 * This must NOT be built with createServerClient plus cookie handlers. That wires the
 * caller's auth cookie into the client, and @supabase/ssr then sends the logged-in
 * user's access token instead of the service key, so every query silently runs under
 * that user's RLS policies and the service role is discarded. Admin writes then appear
 * to succeed while affecting zero rows.
 *
 * Deliberately cookie-free and session-less.
 */
export async function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service credentials are not configured.')
  }

  return createSupabaseClient(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
