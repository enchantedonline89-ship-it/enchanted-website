# Enchanted Style

Next.js 16 storefront and shop-management application for Enchanted Style.

## Local development

```powershell
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when connecting a real Supabase project.
The public client preview remains available at `/admin/demo` without database
credentials; protected owner routes require Supabase.

## Verification

```powershell
npm run lint
npx tsc --noEmit --incremental false
npm test
npm run build
npm run test:e2e
```

## Cloudflare Workers

The application uses `@opennextjs/cloudflare` and Wrangler. Authenticate once
with `wrangler login`, then follow `SETUP.md` for database migrations, secrets,
preview deployment, and production verification.

```powershell
npm run preview:cloudflare
npm run deploy:cloudflare
```
