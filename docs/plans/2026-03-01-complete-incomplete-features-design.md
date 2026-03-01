# Design: Complete Incomplete Features — Enchanted Style
**Date:** 2026-03-01
**Status:** Approved
**Scope:** 5 incomplete features identified during codebase analysis

---

## 1. Admin Auth Middleware (middleware.ts)

**Problem:** `middleware.ts` was deleted, leaving all `/admin/*` routes unprotected.

**Solution:** Restore `middleware.ts` at the project root using the standard Supabase SSR + Next.js pattern.

**Behaviour:**
- Matcher: `/admin/:path*`
- Creates server Supabase client, refreshes session from cookies
- Unauthenticated → redirect to `/admin/login`
- Authenticated user on `/admin/login` → redirect to `/admin/dashboard`
- Sets updated auth cookies on every response

**Files:** `middleware.ts` (new/restored at root)

---

## 2. Shopping Cart + WhatsApp Checkout

### 2a. CartContext Enhancement
- Add `localStorage` persistence: sync on every state change, hydrate on mount
- Cart item shape: `{ product: Product, selectedSize: string, quantity: number }`
- Wrap `app/layout.tsx` with `CartProvider`

### 2b. Size Selection on ProductCard
- "Add to Cart" button opens an inline size picker (product's `sizes[]` as pill buttons)
- After size is selected, item is added to cart
- If product has no sizes, add directly

### 2c. CartDrawer Component (`components/public/CartDrawer.tsx`)
- Slide-in panel from right, toggled by cart icon in Navbar
- Displays: product image, name, selected size, price, quantity +/- controls, remove button
- Shows subtotal
- "Order via WhatsApp" CTA button at bottom

### 2d. WhatsApp Order Message Builder
- Add `buildCartOrderURL(items: CartItem[])` to `lib/whatsapp.ts`
- Generates pre-filled wa.me URL with formatted order summary:
  ```
  Hi! I'd like to place an order from Enchanted Style 💫

  Items:
  • {Product Name} — Size {size} × {qty} — ${price}

  Total: ${total}

  Please confirm availability!
  ```

### 2e. Navbar Cart Icon
- Add cart icon button to `Navbar` (desktop + mobile)
- Shows item count badge when cart has items
- Click opens `CartDrawer`

**Files:**
- `lib/cart-context.tsx` (modify — add localStorage persistence)
- `components/public/CartDrawer.tsx` (new)
- `components/public/ProductCard.tsx` (modify — add size picker + add to cart)
- `components/public/Navbar.tsx` (modify — add cart icon + badge)
- `lib/whatsapp.ts` (modify — add buildCartOrderURL)
- `app/layout.tsx` (modify — wrap with CartProvider)

---

## 3. Mobile Menu

**Problem:** Hamburger button exists in Navbar but has no menu drawer.

**Solution:** Add mobile menu drawer inside existing `Navbar` component.

**Behaviour:**
- Slide-in drawer from right on hamburger click
- Semi-transparent backdrop overlay (click to close)
- Nav links: Home, Collections, About, New Arrivals (scroll to anchors)
- "Chat on WhatsApp" button at bottom using `WHATSAPP_FLOAT_URL`
- CSS translate transition for open/close animation
- Closes on nav link click

**Files:** `components/public/Navbar.tsx` (modify)

---

## 4. New Arrivals Section

**Problem:** Navbar has `#new` anchor link but no matching section on the home page.

**Solution:** Add a `NewArrivals` section to `app/page.tsx` between Hero and ProductGrid.

**Behaviour:**
- Shows 5 most recently added active products (sorted by `created_at DESC`, no extra fetch needed)
- Section heading: "New Arrivals" in gold gradient font style matching site theme
- Layout: horizontally scrollable row on mobile, 5-column grid on desktop
- Uses existing `ProductCard` component
- `id="new"` for anchor navigation

**Files:**
- `components/public/NewArrivals.tsx` (new)
- `app/page.tsx` (modify — add NewArrivals component)

---

## 5. Product Image Gallery (Lightbox)

**Problem:** Products have `additional_images: string[]` in DB but the UI never displays them.

**Solution:** Add a lightbox modal triggered by clicking the main product image on `ProductCard`.

**Behaviour:**
- Only shown for products with `additional_images.length > 0`
- Lightbox shows all images: `[image_url, ...additional_images]`
- Left/right arrow navigation
- Dot indicator pills
- Click outside or press Esc to close
- Keyboard left/right arrow support
- Smooth fade/slide transition between images

**Files:**
- `components/public/ImageLightbox.tsx` (new)
- `components/public/ProductCard.tsx` (modify — add lightbox trigger)

---

## Implementation Order

1. Middleware (security — highest priority)
2. CartContext persistence + CartProvider in layout
3. CartDrawer component
4. Size picker + cart integration in ProductCard + whatsapp order URL
5. Navbar: cart icon + mobile menu
6. New Arrivals section
7. Image lightbox

---

## Constraints & Notes

- No new dependencies — use existing: React state, Tailwind, Next.js built-ins
- WhatsApp number already in `lib/whatsapp.ts`: `96181351084`
- All components must match existing dark glamour theme (black/gold/rose-gold)
- TypeScript strict mode — all new code fully typed
- Do not break existing GSAP/Three.js animations
