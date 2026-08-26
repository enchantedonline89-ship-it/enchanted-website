# Enchanted Style — Cloudflare production setup

## 1. Platform resources

The Worker expects these bindings from `wrangler.jsonc`:

- D1 database `enchanted-production` as `DB`
- R2 bucket `enchanted-product-media` as `MEDIA`
- Queue `enchanted-email` as `EMAIL_QUEUE`
- Dead-letter queue `enchanted-email-dlq`

Enable R2 in the Cloudflare dashboard and create any missing resources, then
apply all versioned migrations (`0001` through `0004`):

```powershell
npx wrangler d1 migrations apply enchanted-production --remote
```

The schema contains Better Auth, owner-scoped addresses, the empty catalog,
color/size stock variants, promotions, orders, inventory safeguards, email
events, audit logs, and recommendation statistics. Product images are stored in
R2; catalog data and stock are stored in D1.

Two Worker cron triggers are configured: every 15 minutes for expired order
reservations and queued mail recovery, and daily at 02:17 UTC for rebuilding
recommendation statistics.

## 2. Authentication

Set these Worker secrets without committing their values:

```powershell
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BETTER_AUTH_URL
```

`BETTER_AUTH_URL` is the final HTTPS origin. The initial owner email is
`Enchantedonline89@gmail.com`. The owner signs in with the rotated credential,
enrolls an authenticator at `/admin/security`, and creates any additional
owner/admin identities from `/admin/staff`. Every staff identity must complete
TOTP enrollment before it can access the management panel.

Customers must create and verify an account before checkout. To enable Google
sign-in, create a Google OAuth web client and set:

```powershell
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Register `<origin>/api/auth/callback/google` as an authorized redirect URI.

## 3. Transactional email

Create a Resend account, verify a sending domain, and configure:

```powershell
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
npx wrangler secret put RESEND_WEBHOOK_SECRET
```

Point the Resend webhook to `<origin>/api/webhooks/resend`. The queue retries
temporary failures and sends exhausted jobs to the dead-letter queue. Order
receipt and every status change include the public order number and the store's
WhatsApp contact, never a prefilled customer order message.

## 4. Optional analytics and error monitoring

PostHog and Sentry remain disabled while their keys are unset. Browser analytics
and replay start only after consent, and all form inputs/text are masked.

PostHog public build variables:

```env
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_INGEST_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_POSTHOG_ASSET_HOST=https://eu-assets.i.posthog.com
NEXT_PUBLIC_POSTHOG_UI_HOST=https://eu.posthog.com
```

Admin technical analytics use `POSTHOG_PERSONAL_API_KEY`,
`POSTHOG_PROJECT_ID`, and `POSTHOG_HOST`. Sentry uses `NEXT_PUBLIC_SENTRY_DSN`
and `SENTRY_DSN`; the admin issue feed also needs `SENTRY_API_TOKEN`,
`SENTRY_ORG`, and `SENTRY_PROJECT`.

## 5. Deploy and verify

```powershell
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run deploy:cloudflare
```

After the first deploy, set `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` to the
exact Worker origin and deploy again. Verify the following before accepting
orders:

- the owner can sign in, create a category, add a product image/color/size stock,
  and see the item on the storefront;
- a customer can create an account, save multiple Lebanon addresses, place a
  $4 cash-on-delivery order, and see its public order number;
- the order appears under Unconfirmed and follows only valid status transitions;
- each status change is recorded and sends an email when Resend is configured;
- Christmas and Ramadan themes are independently toggleable and respect reduced
  motion; scheduled activations refresh within about one minute;
- mobile, tablet, and desktop layouts have no horizontal overflow.

## 6. Custom domain

Add the hostname as a Worker custom domain, update `NEXT_PUBLIC_SITE_URL` and
`BETTER_AUTH_URL`, and update Google/Resend webhook allowlists. Cloudflare
provisions TLS automatically.

Once the final hostname is known, create a Cloudflare Turnstile widget for that
hostname, add the public site key to the storefront, store the secret with
`wrangler secret put`, and verify the token server-side on account and checkout
requests before opening the store. Do not configure a placeholder hostname.
