const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

interface ApiError {
  error?: unknown
}

export async function adminCatalogRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  })
  const body = await response.json().catch(() => ({})) as T & ApiError
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'The catalog change could not be saved.')
  }
  return body
}

export async function uploadCatalogImage(file: File): Promise<string> {
  if (!IMAGE_TYPES.has(file.type)) throw new Error('Use a JPG, PNG, or WEBP image.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Images must be no larger than 5MB.')
  const form = new FormData()
  form.set('file', file)
  const response = await fetch('/api/admin/media', { method: 'POST', body: form })
  const body = await response.json().catch(() => ({})) as { url?: unknown; error?: unknown }
  if (!response.ok || typeof body.url !== 'string') {
    throw new Error(typeof body.error === 'string' ? body.error : 'The image could not be uploaded.')
  }
  return body.url
}
