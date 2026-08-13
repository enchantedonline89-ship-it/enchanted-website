# Enchanted Style — Setup and deployment

## 1. Create Supabase

Create a Supabase project in a region appropriate for customers in Lebanon.
In the SQL Editor, run these files in order:

1. `supabase/schema.sql`
2. `supabase/product-detail-migration.sql`
3. `supabase/orders-migration.sql`
4. `supabase/admin-rls-ensure.sql`
5. `supabase/analytics-views.sql`

The final two files are the canonical security and analytics definitions and
are safe to re-run. The analytics script deliberately does not refresh its
materialized view inside order transactions; refresh it from the protected
admin dashboard or a scheduled job.

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

## 3. Deploy to Vercel

Import the Git repository into Vercel and add all five required environment
variables above for Production and Preview. Optional Sentry and PostHog values
are documented in `.env.example`. Deploy only after the production build passes.

If using the CLI:

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ADMIN_EMAIL
vercel env add NEXT_PUBLIC_ADMIN_EMAIL
vercel --prod
```

## 4. Production verification

- The catalog shows only live Supabase inventory.
- A customer can sign up, choose a valid size, place one order, and see it in order history.
- The WhatsApp handoff contains the same server-priced items and total.
- The owner can create/edit/delete a product and the audit log records the change.
- A signed-out visitor is redirected away from protected admin and order pages.
- A normal customer cannot write catalog rows or upload product images.
- An order insert and status update both succeed before analytics are refreshed.
- Manual analytics refresh succeeds and the dashboard reflects the test order.
- `/sitemap.xml` includes active product URLs; admin and reset pages are noindex.
- Phone (390px), tablet (768/820px), and desktop layouts have no horizontal overflow.

## 5. Custom domain

Add the domain in Vercel, follow its DNS instructions, then update the single
`SITE_URL` value in `components/seo/site.ts` and the OAuth redirect allowlists.
Vercel provisions TLS automatically.
