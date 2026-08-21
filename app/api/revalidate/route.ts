import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { authorizeAdminRequest } from "@/lib/admin-api"

/**
 * POST /api/revalidate
 * Called by admin panel after any product/category mutation.
 * Requires a server-verified Better Auth admin session.
 * Triggers ISR revalidation for the public catalog page.
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeAdminRequest(request)
    if (!authorization.ok) return authorization.error

    revalidatePath("/")
    revalidatePath("/", "layout")
    revalidatePath("/product/[slug]", "page")
    revalidateTag("site-settings", "max")
    return NextResponse.json({ revalidated: true })
  } catch {
    return NextResponse.json({ revalidated: false }, { status: 500 })
  }
}
