import { renderBrandOgImage } from "@/components/seo/og-image"

export const alt = "Size guide, Enchanted Style"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return renderBrandOgImage({ heading: "Size guide" })
}
