import { NextResponse } from 'next/server'
import { getCatalogMediaBucket, isCatalogMediaKey } from '@/lib/admin-catalog-media'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const key = (await params).key.join('/')
  if (!isCatalogMediaKey(key)) return NextResponse.json({ error: 'Image not found.' }, { status: 404 })

  const bucket = await getCatalogMediaBucket()
  if (!bucket) return NextResponse.json({ error: 'Media storage unavailable.' }, { status: 503 })
  const object = await bucket.get(key)
  if (!object) return NextResponse.json({ error: 'Image not found.' }, { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('etag', object.httpEtag)
  headers.set('x-content-type-options', 'nosniff')
  return new Response(object.body, { headers })
}
