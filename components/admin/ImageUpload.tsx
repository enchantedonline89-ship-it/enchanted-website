'use client'
import { useState, useRef } from 'react'
import { X, UploadSimple, CircleNotch } from '@phosphor-icons/react/ssr'
import { uploadProductImage } from '@/lib/upload-image'

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

    setUploading(true)
    setError(null)

    try {
      onChange(await uploadProductImage(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="t-meta block">{label}</label>

      {/* Preview */}
      {value && (
        <div className="relative w-full h-48 overflow-hidden border border-line bg-paper-raised">
          {/* Preview URLs may be freshly pasted or local blobs; using the browser
              image element avoids rejecting an owner-selected host before save. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Remove this image"
            className="absolute top-2 right-2 w-8 h-8 bg-ink/40 text-ink flex items-center justify-center border border-line hover:border-signal-error hover:text-signal-error transition-colors"
          >
            <X size={14} weight="light" />
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
        className="field"
      />

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn btn-ghost"
        >
          {uploading ? (
            <>
              <CircleNotch size={14} weight="light" className="animate-spin" />
              Uploading
            </>
          ) : (
            <>
              <UploadSimple size={14} weight="light" />
              Upload image
            </>
          )}
        </button>
        <span className="t-meta normal-case tracking-normal">Max 5MB, JPG, PNG or WEBP</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        className="hidden"
      />

      {error && <p className="text-signal-error text-xs">{error}</p>}
    </div>
  )
}
