import { ImageResponse } from "next/og"

const SIZE = { width: 1200, height: 630 }

/* DESIGN.md tokens, copied exactly. Contrast is the only accent: no
   gradient, no gold, no rounded corners anywhere below. */
const NOIR = "#0b0b0c"
const BONE = "#f4f2ed"
const BONE_DIM = "#a9a6a0"
const BONE_FAINT = "#8a8781"
const LINE = "rgba(244,242,237,0.14)"

/**
 * Shared renderer for every route's opengraph-image.tsx. Next.js falls
 * back to the same file for twitter:image when no twitter-image.tsx
 * exists, so one generator covers both.
 *
 * Deliberately stays inside Satori's well-documented safe subset: flexbox
 * layout only, every multi-purpose element gets an explicit display, and
 * no custom font is loaded (the built-in fallback renders without a
 * network fetch, so generation can never fail on a font request timing
 * out). That trades exact Archivo fidelity for reliability, which is the
 * right trade for an image every WhatsApp and Instagram link preview will
 * request.
 */
export function renderBrandOgImage({ heading, sub }: { heading: string; sub?: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          backgroundColor: NOIR,
          padding: 80,
        }}
      >
        {/* The brand line is a wayfinder for sub-pages. On the root card the
            heading IS the brand, so printing both just says the name twice. */}
        {heading !== "Enchanted Style" && (
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: BONE_FAINT,
              marginBottom: 28,
            }}
          >
            Enchanted Style
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            color: BONE,
            lineHeight: 1.05,
            maxWidth: 1000,
          }}
        >
          {heading}
        </div>
        <div
          style={{
            display: "flex",
            width: 120,
            height: 1,
            backgroundColor: LINE,
            marginTop: 32,
            marginBottom: sub ? 32 : 0,
          }}
        />
        {sub ? (
          <div style={{ display: "flex", fontSize: 28, color: BONE_DIM, maxWidth: 820 }}>
            {sub}
          </div>
        ) : null}
      </div>
    ),
    SIZE,
  )
}
