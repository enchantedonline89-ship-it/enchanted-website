import { renderBrandOgImage } from "@/components/seo/og-image"

export const alt = "Privacy policy, Enchanted Style"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return renderBrandOgImage({ heading: "Privacy policy" })
}
