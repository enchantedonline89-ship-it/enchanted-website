import { Color } from "three"

/**
 * Single source of truth for the brand gold inside the WebGL scene. Mirrors
 * the tokens in app/globals.css (--color-gold, --color-gold-hi,
 * --color-gold-deep) without importing CSS into the engine. The two are not
 * mechanically linked, so if the palette moves again, update both.
 */
export const GOLD_HEX = {
  core: 0xf0c068,
  highlight: 0xf8d488,
  deep: 0x7a5518,
} as const

export const GOLD = {
  core: new Color(GOLD_HEX.core),
  highlight: new Color(GOLD_HEX.highlight),
  deep: new Color(GOLD_HEX.deep),
}
