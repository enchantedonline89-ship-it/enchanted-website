# Enchanted Style — Setup & Deployment Guide

## 1. Supabase Project Setup

### Create project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it `enchanted-style`, choose a strong DB password, pick the region closest to Lebanon (e.g. EU West)

### Run the database schema
1. Supabase Dashboard → **SQL Editor** → New query
2. Copy the entire contents of `supabase/schema.sql` and run it
3. This creates: `categories`, `products`, `admin_logs` tables + RLS policies + seed data

### Disable public sign-ups (CRITICAL)
1. Supabase Dashboard → **Authentication → Providers → Email**
2. Toggle **"Enable sign ups"** → **OFF**
3. This ensures only manually-created admin accounts can log in

### Create admin account
1. Supabase Dashboard → **Authentication → Users → Add user**
2. Enter your email and a strong password
3. This is your admin login for `/admin`

### Create storage bucket
1. Supabase Dashboard → **Storage → New bucket**
2. Name: `product-images`
3. Toggle **Public bucket** → ON
4. Click Create, then go to **Policies** and add:
   - SELECT: allow `anon` and `authenticated` (public reads)
   - INSERT: allow `authenticated` only (admin uploads)

### Get your API keys
1. Supabase Dashboard → **Settings → API**
2. Copy: Project URL, anon/public key, service_role key (keep secret!)

---

## 2. Local Development

### Fill in environment variables
Edit `.env.local` and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Add your logo
- Drop your logo file as `public/logo.png`
- Recommended: PNG with transparent background, at least 300px wide

### Start the dev server
```bash
npm run dev
```

- Public catalog: http://localhost:3000
- Admin panel: http://localhost:3000/admin/login

---

## 3. Deploy to Vercel

### Option A: GitHub → Vercel (recommended)
1. Push this repo to GitHub:
   ```bash
   git add .
   git commit -m "Initial Enchanted Style build"
   git remote add origin https://github.com/YOUR_USERNAME/enchanted
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select the `enchanted` repo
4. In **Environment Variables**, add all 3 vars from your `.env.local`
5. Click **Deploy**

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel
# Follow the prompts, then:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
```

---

## 4. Post-Deployment Checklist

- [ ] Visit your Vercel URL — hero loads, 3D gems react to mouse
- [ ] Products grid displays with Unsplash images
- [ ] WhatsApp buttons open correct chat with pre-filled message
- [ ] Go to `/admin/login` — login with your Supabase admin credentials
- [ ] Add a test product via admin — appears on catalog
- [ ] Upload product image — appears in Supabase Storage
- [ ] Edit product — audit log records the change
- [ ] Delete product — audit log records the deletion
- [ ] Try accessing `/admin/dashboard` while logged out → redirected to login ✓

---

## 5. Adding Your Logo Colors

Once your logo is uploaded, to extract the brand colors and update the theme:

1. Open `app/globals.css`
2. In the `@theme inline` block, update:
   ```css
   --color-gold: #YOUR_BRAND_GOLD;
   --color-gold-light: #YOUR_BRAND_GOLD_LIGHT;
   ```
3. Redeploy

---

## 6. Custom Domain (Optional)

1. Vercel Dashboard → Your project → **Settings → Domains**
2. Add your domain (e.g. `enchantedstyle.com`)
3. Follow DNS instructions from Vercel
4. SSL certificate is automatic

---

## Tech Stack Reference
| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Deployed on Vercel |
| Database | Supabase PostgreSQL | Free tier |
| Auth | Supabase Auth | Email/password |
| Storage | Supabase Storage | Product images |
| 3D/WebGL | Three.js | Hero section |
| Animations | GSAP + ScrollTrigger | Scroll reveals |
| Styling | Tailwind CSS v4 | Dark glam theme |
| Fonts | Playfair Display + DM Sans | Google Fonts |
