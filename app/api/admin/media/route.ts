import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import {
  catalogMediaKey,
  catalogMediaUrl,
  getCatalogMediaBucket,
  isCatalogMediaKey,
  validateCatalogImage,
} from '@/lib/admin-catalog-media'

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key') ?? ''
  if (!isCatalogMediaKey(key)) return NextResponse.json({ error: 'Invalid media key.' }, { status: 400 })
  return NextResponse.redirect(new URL(catalogMediaUrl(key), request.nextUrl.origin), 308)
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request)
  if (!authorization.ok) return authorization.error

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid upload body.' }, { status: 400 })
  }
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })

  const validated = await validateCatalogImage(file)
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 })
  const bucket = await getCatalogMediaBucket()
  if (!bucket) return NextResponse.json({ error: 'Media storage unavailable.' }, { status: 503 })

  const key = catalogMediaKey(validated.extension)
  try {
    await bucket.put(key, validated.bytes, {
      httpMetadata: {
        contentType: validated.contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: { uploadedBy: authorization.user.id },
    })
  } catch (error) {
    console.error('Catalog image upload failed.', error)
    return NextResponse.json({ error: 'The image could not be uploaded.' }, { status: 500 })
  }

  return NextResponse.json({ key, url: catalogMediaUrl(key) }, { status: 201 })
}
