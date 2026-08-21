'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { X, UploadSimple, CircleNotch, ArrowLeft, ArrowRight } from '@phosphor-icons/react/ssr'
import { uploadCatalogImage } from '@/lib/admin-catalog-client'

/**
 * Ordered image gallery for a product.
 *
 * The database has always had `additional_images`, and the storefront lightbox
 * has always rendered it, but the admin form only ever accepted one image, so
 * no product could have a second. This is the control that closes that gap.
 *
 * Position 1 is the cover: it is what the catalog tile and every share preview
 * use. That is stated in the UI rather than left for the owner to discover.
 */
export default function GalleryUpload({
  cover,
  extra,
  onChange,
}: {
  cover: string
  extra: string[]
  onChange: (next: { cover: string; extra: string[] }) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // One flat, ordered list is far easier to reason about than a cover plus a
  // tail; it is split again only on the way out.
  const all = [cover, ...extra].filter(Boolean)

  function commit(list: string[]) {
    const clean = list.filter(Boolean)
    onChange({ cover: clean[0] ?? '', extra: clean.slice(1) })
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const remaining = 9 - all.length
    if (remaining <= 0) {
      setError('A product can have one cover and up to eight additional photos.')
      e.target.value = ''
      return
    }

    setBusy(true)
    setError(files.length > remaining ? 'Only the first photos that fit the nine-photo limit were uploaded.' : null)
    const added: string[] = []
    try {
      for (const file of files.slice(0, remaining)) {
        added.push(await uploadCatalogImage(file))
      }
      commit([...all, ...added])
    } catch (err) {
      // Keep whatever did upload rather than discarding the whole batch.
      if (added.length) commit([...all, ...added])
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= all.length) return
    const next = [...all]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    commit(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="t-meta block">Photos</label>
        <p className="t-meta mt-1 normal-case tracking-normal">
          The first photo is the cover. It is what shows in the catalog and in
          WhatsApp link previews. Four to six per piece works well.
        </p>
      </div>

      {all.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {all.map((src, i) => (
            <li key={src} className="relative">
              <div className="relative aspect-[3/4] w-full overflow-hidden border border-line bg-paper-sunken">
                <Image src={src} alt="" fill sizes="160px" className="object-cover" />
                {i === 0 && (
                  <span className="absolute inset-x-0 bottom-0 bg-gold px-1 py-0.5 text-center text-[0.5625rem] font-semibold uppercase tracking-widest text-ink">
                    Cover
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Move photo ${i + 1} earlier`}
                    className="flex h-7 w-7 items-center justify-center border border-line text-ink-dim transition-colors hover:border-ink hover:text-ink disabled:opacity-30"
                  >
                    <ArrowLeft size={12} weight="light" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === all.length - 1}
                    aria-label={`Move photo ${i + 1} later`}
                    className="flex h-7 w-7 items-center justify-center border border-line text-ink-dim transition-colors hover:border-ink hover:text-ink disabled:opacity-30"
                  >
                    <ArrowRight size={12} weight="light" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => commit(all.filter((_, j) => j !== i))}
                  aria-label={`Remove photo ${i + 1}`}
                  className="flex h-7 w-7 items-center justify-center border border-line text-ink-dim transition-colors hover:border-signal-error hover:text-signal-error"
                >
                  <X size={12} weight="light" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn btn-ghost"
        >
          {busy ? (
            <>
              <CircleNotch size={14} weight="light" className="animate-spin" />
              Uploading
            </>
          ) : (
            <>
              <UploadSimple size={14} weight="light" />
              {all.length === 0 ? 'Add photos' : 'Add more'}
            </>
          )}
        </button>
        <span className="t-meta normal-case tracking-normal">
          JPG, PNG or WEBP, under 5MB each. You can select several at once.
        </span>
      </div>

      {error && (
        <p role="alert" className="border border-signal-error/40 bg-signal-error/10 px-3 py-2.5 text-[0.8125rem] text-signal-error">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  )
}
