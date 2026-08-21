# Enchanted Style — Setup and deployment

## 1. Create Supabase

Create a Supabase project in a region appropriate for customers in Lebanon.
In the SQL Editor, run these files in order:

1. `supabase/schema.sql`
2. `supabase/product-detail-migration.sql`
3. `supabase/orders-migration.sql`
4. `supabase/admin-rls-ensure.sql`
5. `supabase/site-settings-migration.sql`
6. `supabase/promotions-events-migration.sql`
7. `supabase/order-tracking-migration.sql`
8. `supabase/analytics-views.sql`

The migrations are idempotent and safe to re-run. Apply the order-tracking
migration before deploying code that returns customer order numbers. Analytics
uses indexed live views, so order inserts and status updates never trigger a
materialized-view refresh.

Keep customer sign-ups enabled under Authentication > Providers > Email.
Checkout requires a verified customer account. If Google OAuth is enabled, add
the deployed `/auth/callback` URL to the provider redirect allowlist.

Create the admin account as `Enchantedonline89@gmail.com`. The current RLS
policies are pinned to this address. Changing it requires updating and re-running
`supabase/admin-rls-ensure.sql` as well as changing the application environment
variables.

Create a public Storage bucket named `product-images`, then run
`supabase/admin-rls-ensure.sql`. Its policies allow public reads but restrict
INSERT, UPDATE, and DELETE to the named admin. Never grant uploads to every
authenticated customer.

## 2. Configure the application

Copy `.env.example` to `.env.local` and set at least:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAIL=Enchantedonline89@gmail.com
NEXT_PUBLIC_ADMIN_EMAIL=Enchantedonline89@gmail.com
```

The service-role key is server-only and must never use a `NEXT_PUBLIC_` prefix.
Keep `ENABLE_MOCK_CATALOG=false` on the customer-facing deployment so a missing
backend fails closed instead of advertising demo inventory.

Install and verify locally:

```powershell
npm install
npm run lint
npm test
npx tsc --noEmit
npm run build
npm run dev
```

The shop is at `http://localhost:3000`; admin login is at
`http://localhost:3000/admin/login`.

## 3. Deploy to Cloudflare Workers

The repository is configured for Cloudflare Workers through OpenNext. Authenticate
Wrangler, validate the configuration, and add server-side secrets without
placing their values in `wrangler.jsonc`:

```powershell
npx wrangler login
npx wrangler whoami
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npm run cf-typegen
npm run deploy:cloudflare
```

Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in the build environment because Next.js embeds
public values at build time. Set `ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_EMAIL` to
the owner address. Optional Sentry and PostHog values remain documented in
`.env.example`.

`wrangler.jsonc` currently enables `ENABLE_MOCK_CATALOG=true` for the temporary
client preview. That mode visibly labels demo inventory and blocks indexing.
Before launch, remove that variable (or set it to `false`) and configure live
Supabase values so the customer-facing deployment fails closed on data outages.

## 4. Production verification

- The catalog shows only live Supabase inventory.
- A customer can sign up, choose a valid size, place one order, and see it in order history.
- The WhatsApp handoff contains the same server-priced items and total.
- The owner can create/edit/delete a product and the audit log records the change.
- A signed-out visitor is redirected away from protected admin and order pages.
- A normal customer cannot write catalog rows or upload product images.
- An order insert returns a human-readable order number.
- Order tracking succeeds only with the matching checkout email.
- A completed order appears in the analytics dashboard without a manual refresh.
- `/sitemap.xml` includes active product URLs; admin and reset pages are noindex.
- Phone (390px), tablet (768/820px), and desktop layouts have no horizontal overflow.

## 5. Custom domain

Add the domain as a Cloudflare Worker custom domain, set `NEXT_PUBLIC_SITE_URL`
to its HTTPS origin, and update the Supabase/Google OAuth redirect allowlists.
Cloudflare provisions TLS automatically.
