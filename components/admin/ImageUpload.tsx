'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  value: string
  onChange: (url: string) => void
  label?: string
}

export default function ImageUpload({ value, onChange, label = 'Product Image' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      onChange(data.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm text-muted">{label}</label>

      {/* Preview */}
      {value && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border bg-card">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-red-500/70 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* URL input */}
      <input
        type="url"
        value={value}
        onChange={e => {
          const url = e.target.value
          // Only accept HTTPS URLs to prevent mixed-content and SSRF via HTTP
          if (url && !url.startsWith('https://')) {
            setError('Only HTTPS image URLs are accepted')
            return
          }
          setError(null)
          onChange(url)
        }}
        placeholder="Paste HTTPS image URL or upload below"
        className="w-full bg-card border border-border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 placeholder:text-muted"
      />

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-border text-muted hover:text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <><span className="animate-spin">↻</span> Uploading...</>
          ) : (
            <><span>↑</span> Upload Image</>
          )}
        </button>
        <span className="text-muted/50 text-xs">Max 5MB · JPG/PNG/WEBP</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
