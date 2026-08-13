# DESIGN.md — Enchanted Style

Brand adjectives, binding: **feminine, romantic, elegant, timeless.**
Brand colours, from the client: **white and gold.**

## 1. Theme

Committed **light**. White ground, near-black ink, gold as the brand accent.

This is not a category default, it follows from the mark. The logo is gold on
transparent, and gold only reads as gold against a light ground; on black it
goes muddy and the champagne highlights disappear. The supplied lockups confirm
it, the white-disc version being the one that holds its detail.

A previous iteration of this site was built dark. That world is anti-reference
now, except for its structure, which was audited hard and survives intact.

`DESIGN_VARIANCE 6` · `MOTION_INTENSITY 5` · `VISUAL_DENSITY 3`

## 2. Colour

| Token | Value | Role | Ratio on paper |
|---|---|---|---|
| `--color-paper` | `#ffffff` | ground | |
| `--color-paper-raised` | `#faf9f7` | drawers, modals, fields | |
| `--color-paper-sunken` | `#f4f2ee` | image wells | |
| `--color-ink` | `#14120e` | primary text | 18.71:1 |
| `--color-ink-dim` | `#5c574e` | secondary text | 7.17:1 |
| `--color-ink-faint` | `#6f6a60` | meta and labels | 5.38:1, 4.81 on sunken |
| `--color-gold` | `#f0c068` | fills and decoration only | 1.69:1 |
| `--color-gold-hi` | `#f8d488` | highlight, hover on gold | |
| `--color-gold-deep` | `#7a5518` | the only gold usable as type | 6.69:1 |
| `--color-line` | `rgba(20,18,14,.12)` | dividers | |
| `--color-line-strong` | `rgba(20,18,14,.46)` | control boundaries | 3.11:1 |

**The rule that governs gold.** The brand gold measures 1.69:1 against white. It
can never carry text. It works as a *fill* with ink on top, which is 11.09:1,
and as a hairline or a rule where no minimum applies. When gold has to be read
as type, it is `--color-gold-deep`, the shadow tone already present in the logo.

That constraint is what makes `.btn-gold` the brand moment: ink on gold, legible
and unmistakably the brand, used once per view at most.

Every ratio above was computed, not estimated. Signal colours
(`#a8321f`, `#2f6b3c`, `#8a5a09`) are functional only: form errors and order
status, never decoration.

## 3. Typography

Two families, each with one job.

- **Cormorant Garamond** carries display. A high-contrast old-style serif is what
  makes the page read as romantic and timeless, and it answers the script and
  the serif already sitting in the logo.
- **Archivo** carries everything functional: prices, size chips, form labels,
  tables. It is far more legible than a display serif at those sizes, and a shop
  that mis-reads a size or a total has failed at its actual job.

| Role | Spec |
|---|---|
| Display | Cormorant, `clamp(2.75rem, 6vw, 5rem)`, 400, tracking `-.015em` |
| Section | Cormorant, `clamp(1.875rem, 3.6vw, 3rem)`, 400 |
| Prose h2 | Cormorant, `1.5rem`, 500 |
| Body | Archivo, `1rem/1.7`, measure 68ch |
| Meta | Archivo, `.6875rem`, tracking `.18em`, uppercase |

Italic Cormorant is used deliberately, once, on the second line of the hero.
The `.mask-line` wrapper reserves descender room so it is never shaved.

## 4. Shape

**All sharp. Radius 0 everywhere**: images, buttons, fields, drawers, chips,
tables. One rule, no exceptions.

Elevation is declared once and is always a hairline. There are no shadows and no
cards on the storefront; grouping is space and `--color-line`.

## 5. Motion

One authored moment: the hero headline rises out of a mask, line by line, and
the gold rule and CTA follow. Everything after that is service motion.

Reveals are `opacity` and `y`, once, `cubic-bezier(.16,1,.3,1)`. Product hover
scales the image 1.04 and moves nothing else. `will-change` is scoped to the
interaction, never declared on a base rule. All of it sits behind
`prefers-reduced-motion`.

## 6. The WebGL layer

The hero carries one shared WebGL context: a slow-turning gold ring drawn from
the logo, a drifting gold dust field, and a travelling specular sweep. Product
tiles carry a CSS-only pointer tilt with a gold rim; no renderer per tile.

It is additive by construction. The headline, rule, subtext and CTA are all
server-rendered and readable before any of it loads, and the whole layer falls
back to a static ghosted logo mark when WebGL is unavailable or motion is
reduced.

## 7. Browser surfaces

Themed from the palette, never left default: selection (champagne on ink),
caret (gold-deep), scrollbar, focus ring, underline offset, and tabular numerals
on every price and total. `color-scheme: light` is declared so native selects
and autofill match.

## 8. States

Every interactive surface ships hover, focus-visible, active, disabled, loading,
empty and error. Overlays share `lib/use-overlay.ts`, which traps focus, returns
it to the trigger, reference-counts the scroll lock, and lets only the topmost
layer consume Escape.

## 9. Admin

Same tokens, different job. Density rises, motion drops to nil. Tables are
hairline-ruled, numerals tabular, status is a word plus a colour rather than a
decorative dot. Admin headings stop at section size; no display serif.

## 10. Bans

Zero em-dashes and en-dashes anywhere visible. No eyebrow labels above headings.
No section numbers. No decorative status dots. No scroll cues. No gradient text.
No glass as decoration. No custom cursor. No hand-rolled SVG icons, Phosphor
only. No fake urgency, invented scarcity, or fabricated review counts. No gold
text that is not `--color-gold-deep`.
