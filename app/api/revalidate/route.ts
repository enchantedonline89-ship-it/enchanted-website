import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/revalidate
 * Called by admin panel after any product/category mutation.
 * Requires an authenticated Supabase session (cookie-based).
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

    revalidatePath("/")
    revalidatePath("/", "layout")
    return NextResponse.json({ revalidated: true })
  } catch {
    return NextResponse.json({ revalidated: false }, { status: 500 })
  }
}
