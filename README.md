# Enchanted

Production Next.js 16 storefront and shop-management application for Enchanted,
deployed on Cloudflare Workers with D1, R2, Queues, and Better Auth.

## Local development

```powershell
npm install
npm run dev
```

Copy `.env.example` to `.env.local` for local secrets. The storefront is backed
only by the configured D1 database; an empty database intentionally renders an
empty catalog until the owner adds products through `/admin/products`.

## Verification

```powershell
npm run lint
npx tsc --noEmit
npm test
npm run build
```

The GitHub verification workflow also performs migration, launch-readiness, and
dependency-audit checks.

## Cloudflare deployment

Authenticate with Wrangler, provision the resources described in `SETUP.md`,
then deploy through OpenNext:

```powershell
npm run cf-typegen
npm run deploy:cloudflare
```

Do not put credentials in `wrangler.jsonc`; add them with `wrangler secret put`.
