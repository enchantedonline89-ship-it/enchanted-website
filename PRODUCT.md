# Enchanted Style product truth

## Store and customer

Enchanted Style is a premium, accessible, trend-led women’s fashion store for
customers in Lebanon. The launch storefront is English and prices are in USD.
The public support number is +961 81 492 994. No business address is published.

## Ordering

1. A customer browses the real owner-managed catalog and chooses available
   color and size variants.
2. Checkout requires a verified Enchanted Style account and a saved Lebanon
   delivery address.
3. The site creates a pending order in Cloudflare D1 and shows its public order
   number. The order appears immediately in the admin Unconfirmed queue.
4. The shop confirms and advances the order through preparing, out for delivery,
   delivered, or cancelled. Each accepted transition is recorded and emailed.
5. Delivery costs $4 throughout Lebanon. Cash is collected on delivery. A
   customer who wants to pay through Whish contacts the shop on WhatsApp first.

Pending orders reserve stock for 24 hours, then cancel and restock automatically
unless an administrator extends the reservation. Customers may cancel any time
before delivery is recorded. Delivery-time and return/refund promises must not be
invented; customer-facing copy remains conservative until the owner publishes
the exact operating policy.

## Catalog and merchandising

The launch database is intentionally empty. The owner creates categories and
uploads real products after deployment. New products start as drafts and cannot
be published without the required price, category, image, and sellable stock
options. Every color and size is an explicit stock variant; there is no silent
unlimited-stock default.

CSV import supports the initial catalog load. Discounts never stack: the best
eligible site-wide or category discount is applied. Featured products, campaign
copy, categories, stock, colors, and color-specific images are controlled by the
admin panel.

## Accounts and administration

Customers can save and manage multiple Lebanon delivery addresses. Staff use
separate identities with owner and admin permissions. Administrative access
requires TOTP two-factor authentication; shared passwords are not an operational
model. Audit records identify the staff account that changed orders, stock,
campaigns, or settings.

## Themes

Default, Christmas, and Ramadan themes can be previewed, scheduled, or enabled
manually. Holiday animation is decorative, reduced on small screens, disabled
for reduced-motion users, and never tints product photography or form content.

## Recommendations and analytics

Recommendations start with category/tag similarity. Delivered-order basket
co-occurrence is the strongest learning signal; consented anonymous impressions,
clicks, and cart intent are weaker ranking signals. Social-proof wording appears
only after enough delivered-order support exists.

PostHog analytics are consent-gated and immediately revocable. Replay is disabled
on authentication, account, address, checkout, tracking, order, and admin routes.
Sentry error reporting excludes request bodies and direct identifiers. Resend,
Sentry, and PostHog health summaries appear in the admin dashboard when their
production credentials are connected.

## Platform

The application runs on Cloudflare Workers through OpenNext. D1 is the
transactional source of truth, R2 stores product media, Queues deliver email with
durable retries, and Better Auth provides email/password and Google authentication.
Secrets live in Cloudflare, never in source control. The final domain determines
canonical SEO URLs, OAuth redirects, Turnstile hostnames, and email links.
