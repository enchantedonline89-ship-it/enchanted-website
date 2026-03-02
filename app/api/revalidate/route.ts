import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// The only email allowed to trigger cache revalidation.
// Set ADMIN_EMAIL in .env.local and Vercel environment variables.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

/**
 * POST /api/revalidate
 * Called by admin panel after any product/category mutation.
 * Requires an authenticated Supabase session (cookie-based) from the admin account.
 * Triggers ISR revalidation for the public catalog page.
 */
export async function POST() {
  try {
    // Verify caller has a valid admin session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the authenticated user is the admin account
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    revalidatePath("/")
    revalidatePath("/", "layout")
    return NextResponse.json({ revalidated: true })
  } catch {
    return NextResponse.json({ revalidated: false }, { status: 500 })
  }
}
