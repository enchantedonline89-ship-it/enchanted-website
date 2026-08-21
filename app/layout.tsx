import type { Metadata } from "next"
import { Suspense } from "react"
import { Archivo, Cormorant_Garamond } from "next/font/google"
import PostHogPageview from "@/components/analytics/PostHogPageview"
import ConsentBanner from "@/components/analytics/ConsentBanner"
import "./globals.css"
import "./three.css"
import { CartProvider } from "@/lib/cart-context"
import { AuthProvider } from "@/lib/auth-context"
import WelcomeModal from "@/components/public/WelcomeModal"
import OrganizationJsonLd from "@/components/seo/OrganizationJsonLd"
import { SITE_URL, SITE_NAME } from "@/components/seo/site"
import SiteThemeShell from "@/components/public/SiteThemeShell"
import { getSiteTheme } from "@/lib/site-theme"

/* Archivo carries everything functional: prices, size chips, form labels. It is
   far more legible at those sizes than a display serif. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
})

/* Cormorant Garamond carries the display voice. A high-contrast old-style serif
   is what makes the page read as romantic and timeless, and it answers the
   script and serif already sitting in the logo. */
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
})

const DESCRIPTION =
  "Heels, boots, dresses, tops and accessories, curated in Lebanon. Cash on delivery, ordered over WhatsApp."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Enchanted Style | Women's Fashion, Lebanon",
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    "women's fashion",
    "Lebanon",
    "Beirut",
    "heels",
    "dresses",
    "boots",
    "accessories",
    "enchanted style",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_NAME,
    description: DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/brand/hero.webp",
        alt: "Enchanted Style women's fashion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DESCRIPTION,
    images: ["/brand/hero.webp"],
  },
  icons: { icon: "/favicon.ico" },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const siteTheme = await getSiteTheme()

  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${cormorant.variable} bg-paper text-ink antialiased`}
      >
        <a
          href="#main"
          className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-5 focus:top-5 focus:z-[100]"
        >
          Skip to content
        </a>
        <OrganizationJsonLd />
        {/* useSearchParams opts its subtree into client rendering, so the
            pageview tracker is isolated behind its own Suspense boundary. */}
        <Suspense fallback={null}>
          <PostHogPageview />
        </Suspense>
        <AuthProvider>
          <CartProvider>
            <SiteThemeShell theme={siteTheme}>
              <WelcomeModal />
              {children}
              <ConsentBanner />
            </SiteThemeShell>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
