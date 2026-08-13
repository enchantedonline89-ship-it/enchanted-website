import { createClient } from '@/lib/supabase/client'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Shared upload path for the admin image controls. Extracted so the single
 * image field and the product gallery cannot drift apart on validation,
 * bucket name or filename strategy.
 */
export async function uploadProductImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Images must be under 5MB. Try exporting it smaller.')
  }

  const supabase = createClient()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, { upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
  return data.publicUrl
}
