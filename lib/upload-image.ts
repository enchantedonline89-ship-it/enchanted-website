import { createClient } from '@/lib/supabase/client'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

async function hasValidSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (file.type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (file.type === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, i) => bytes[i] === value)
  }
  if (file.type === 'image/webp') {
    return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  }
  return false
}

/**
 * Shared upload path for the admin image controls. Extracted so the single
 * image field and the product gallery cannot drift apart on validation,
 * bucket name or filename strategy.
 */
export async function uploadProductImage(file: File): Promise<string> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new Error('Use a JPG, PNG, or WEBP image.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Images must be under 5MB. Try exporting it smaller.')
  }
  if (!(await hasValidSignature(file))) {
    throw new Error('The file contents do not match a supported image format.')
  }

  const supabase = createClient()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, { upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
  return data.publicUrl
}
