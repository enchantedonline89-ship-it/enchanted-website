# PRODUCT.md — Enchanted Style

Durable product truth. Visual decisions live in DESIGN.md, not here.

## What this is

An online catalog for Enchanted Style (@enchanted.style_), a women's fashion and
footwear brand in Lebanon. Customers browse, build a cart, and place the order
through WhatsApp. There is no card checkout and no self-service payment.

## Who it is for

Women in Lebanon, mostly arriving from Instagram on a phone, often in the evening.
They already know the brand's feed. The site is where they see the full range,
check sizes and prices, and hand an order to the owner without a payment barrier.

## How an order actually works

1. Browse the catalog, pick a size, add to cart.
2. Sign in (Google or email) to attach the order to an account.
3. Fill delivery details: name, phone, address, city, area.
4. The order is written to the database, then opened as a prefilled WhatsApp
   message to +961 81 351 084. The owner confirms and arranges delivery.
5. Payment is cash on delivery.

Delivery fee is $3 inside Beirut and $4 outside. This pair is validated
server-side against the selected area and must stay consistent everywhere.

## Catalog shape

Six categories: Heels & Stilettos, Boots & Ankle Boots, Sneakers, Dresses,
Tops & Sets, Accessories. Clothing carries letter sizes, footwear carries EU
numeric sizes, accessories carry no size. Prices sit roughly between $29 and $180.

## Surfaces

- **Storefront** (Persuade): home, catalog grid, cart drawer, auth, order history,
  and the policy pages. Design is doing sales work here.
- **Admin** (Operate): dashboard, products, categories, orders. One person, the
  owner, using it to run the shop. Scanability beats expression.

## Brand

Supplied by the client, 2026-08-12. Colours are **white and gold**. The brand
reads **feminine, romantic, elegant, timeless**.

The mark is a gold script "Enchanted" over a gold serif "STYLE" with three
stars, inside a double gold ring. Source artwork is a transparent PDF; the
working assets extracted from it live in `public/brand/`. The client supplied
both a gold-on-black and a gold-on-white lockup, and the site is built on white
because gold only holds its champagne highlights against a light ground.

`DESIGN.md` carries the consequence that governs every screen: the brand gold
measures 1.69:1 against white and therefore cannot carry text. It is a fill and
a rule. Gold that must be read is the logo's own shadow tone, `#7a5518`.

## Constraints that are not negotiable

- WhatsApp number `96181351084` lives only in `lib/whatsapp.ts`.
- Admin authority is `process.env.ADMIN_EMAIL` server-side and the RLS policies
  keyed on `LOWER(auth.email())`. Design never touches that gate.
- Product photography comes from the owner. The design cannot assume studio
  quality or a consistent background, so it must hold up with uneven source images.
- Copy is English. Prices display in USD.

## Known state, 2026-08-11

The Supabase project `mnbdyiemlifvxvgobfwq` no longer resolves. Until a backend is
reconnected, the storefront renders the mock catalog and auth/admin cannot sign in.
