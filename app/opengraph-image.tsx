import { renderBrandOgImage } from "@/components/seo/og-image"

export const alt = "Enchanted Style, women's fashion in Lebanon"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return renderBrandOgImage({
    heading: "Enchanted Style",
    sub: "Women's fashion in Lebanon, ordered on WhatsApp.",
  })
}
