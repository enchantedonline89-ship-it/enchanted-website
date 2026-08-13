# Assets to create

The hero currently has a headline, a gold rule, a line of copy, a gold button,
and drifting gold dust on white. The right side is deliberately empty. It is
waiting for one hero asset.

Brand: white and gold. Feminine, romantic, elegant, timeless.
Gold range from the logo: highlight `#F8D488`, core `#F0C068`, deep `#7A5518`.
Ground is pure white `#FFFFFF`.

---

## 1. HERO ASSET (the one that matters)

**Where it goes:** `public/brand/hero.png`, dropped into the `visual` slot of
`components/public/Hero.tsx`. I wire it in one line once the file exists.

**Specs, non-negotiable:**

| | |
|---|---|
| Format | PNG with real transparency (alpha), not white-matted |
| Size | 2000 x 2600 px, portrait |
| Subject placement | Occupies the RIGHT side. Left 40% must stay empty, the headline sits there |
| Background | Fully transparent. No backdrop, no floor, no vignette, no shadow plate |
| Colour | Warm gold and cream only. No cool tones, no grey, no black |
| Weight | Under 600KB after export. It is the LCP element |

**Avoid:** hard drop shadows, coloured backgrounds, text or logos baked in,
harsh studio flash, anything with a rectangular edge. It has to melt into white.

### Option A, recommended: a real garment, shot or rendered

The strongest hero for a shop is the product itself. A single evening dress on
an invisible mannequin or in mid-air, so the fabric reads.

**Image prompt:**

```
Editorial fashion photograph of a single champagne-gold silk evening gown,
floating on an invisible mannequin, captured mid-movement so the fabric drapes
and folds naturally. Soft diffused daylight from the upper left, gentle warm
highlights along the silk, no harsh shadows. Pure white seamless background,
isolated subject, no props, no model, no face. Elegant, romantic, timeless
luxury fashion campaign. Shot on medium format, 85mm, shallow depth of field.
Colour palette strictly warm gold, champagne and cream. Vertical composition
with the gown positioned on the right third of the frame, generous empty white
space on the left. High resolution, clean cut-out edges.
```

Then remove the background so it is genuinely transparent.

### Option B: abstract gold silk form

Safer if you cannot shoot a garment. Reads as luxury without claiming a product.

**Image prompt:**

```
A single ribbon of liquid champagne-gold silk suspended in air, twisting into a
soft elegant curve, lit by warm diffused light from the upper left. Fine
specular highlights along the folds, deep bronze in the shadows. Pure white
seamless background, isolated, no props, no text. Feminine, romantic, timeless.
Vertical composition, the ribbon occupying the right side of the frame with
generous empty white space on the left. Photorealistic render, high resolution,
clean edges, no drop shadow.
```

### Option C: 3D model, if you want a real asset file

Only worth it if you want the object to turn slowly or catch light as the page
scrolls. Otherwise Option A or B is cheaper and looks the same.

**Brief for a 3D artist or a text-to-3D tool:**

```
Subject: a single length of silk fabric, roughly 1.2 m, caught mid-fall and
frozen in an elegant S-curve. Not a ring, not a torus, not a geometric shape.
Material: satin, anisotropic specular, base colour #F0C068, highlight #F8D488,
shadow #7A5518. Slightly translucent at the thin edges.
Lighting: single large soft area light upper left, warm white, plus a weak fill
from the right. No rim light, no bloom.
Delivery: GLB, under 2 MB, under 40k triangles, 1 material, 1024px textures max,
Y-up, origin at the base of the curve.
Background: none, transparent render.
```

Hard constraints if you go this route: no glow, no bloom, no lens flare, no
rotating logo, no geometric primitives. Under 2 MB or it will not ship.

---

## 2. PRODUCT PHOTOGRAPHY (this is what actually sells)

This matters more than the hero. Every piece now has its own page that can hold
four to six photos, and the admin uploader lets you order them.

**Ask per product, in this order:**

**Footwear**
1. Side profile, whole shoe, plain light surface. This is the cover.
2. Front three-quarter, shows toe shape
3. **Worn, standing, shot from knee height.** The most valuable shot and the one
   most often skipped. It is the only frame that answers "how does this look on"
4. Back or sole, shows the heel height
5. Optional close-up of texture, buckle or embellishment

**Dresses, tops and sets**
1. **Full length worn, front, whole garment in frame.** Head may be cropped
2. Full length worn, back or side
3. Seated or mid-movement, shows whether it rides up
4. Detail close-up: fabric, sheen, lace, straps
5. Optional flat-lay on plain surface for true colour

**Accessories**
1. Whole item straight on, filling the frame
2. **Held in hand or worn.** A bag or a clip has no size intuition otherwise
3. Interior or opening
4. Hardware detail

**Rules that matter more than the count:**
- Same surface and same light across all shots of one product. A colour shift
  between photo 1 and photo 3 reads as a lie
- Daylight near a window. Never direct flash: it destroys gold, satin and sequins
- **Portrait, 3:4.** The site crops to 3:4 everywhere; anything else gets cropped
  in a way you did not choose
- The cover must still read at 160 px wide
- No burned-in text, stickers or Instagram frames

---

## 3. ALREADY DONE, nothing needed from you

- Logo assets extracted from your PDF to `public/brand/`: transparent mark,
  wordmark, app icons at 192 and 512, apple icon, favicon
- Social share image generated per page, 1200 x 630, white and gold, so a link
  pasted into WhatsApp or Instagram previews properly
