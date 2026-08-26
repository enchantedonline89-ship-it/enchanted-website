import { getCloudflareContext } from '@opennextjs/cloudflare'

export const MAX_CATALOG_IMAGE_BYTES = 5 * 1024 * 1024

type ImageExtension = 'jpg' | 'png' | 'webp'

const imageTypes: Record<string, ImageExtension> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function bytesMatch(type: string, bytes: Uint8Array): boolean {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  }
  return type === 'image/webp'
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
}

export async function validateCatalogImage(file: File): Promise<
  | { ok: true; extension: ImageExtension; bytes: ArrayBuffer; contentType: string }
  | { ok: false; error: string }
> {
  const extension = imageTypes[file.type]
  if (!extension) return { ok: false, error: 'Use a JPG, PNG, or WEBP image.' }
  if (file.size < 4 || file.size > MAX_CATALOG_IMAGE_BYTES) {
    return { ok: false, error: 'Images must be no larger than 5MB.' }
  }
  const bytes = await file.arrayBuffer()
  if (!bytesMatch(file.type, new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 12)))) {
    return { ok: false, error: 'The file contents do not match its image type.' }
  }
  return { ok: true, extension, bytes, contentType: file.type }
}

export function catalogMediaKey(
  extension: ImageExtension,
  date = new Date(),
  id = crypto.randomUUID(),
): string {
  return `products/${date.toISOString().slice(0, 7)}/${id}.${extension}`
}

export function isCatalogMediaKey(value: string): boolean {
  return /^products\/\d{4}-(?:0[1-9]|1[0-2])\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(value)
}

export function catalogMediaUrl(key: string): string {
  return `/media/${key}`
}

export async function getCatalogMediaBucket(): Promise<R2Bucket | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const bucket: unknown = Reflect.get(env, 'MEDIA')
    if (typeof bucket !== 'object' || bucket === null) return null
    if (typeof Reflect.get(bucket, 'put') !== 'function' || typeof Reflect.get(bucket, 'get') !== 'function') return null
    return bucket as R2Bucket
  } catch {
    return null
  }
}
