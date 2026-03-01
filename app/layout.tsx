import type { Metadata } from "next"
import { Playfair_Display, DM_Sans } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/lib/cart-context"

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
})

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Enchanted Style — Women's Fashion Lebanon",
  description:
    "Curated women's fashion from Lebanon. Heels, boots, dresses, tops & accessories. Where glamour meets edge. Order via WhatsApp.",
  keywords: ["women's fashion", "Lebanon", "heels", "dresses", "boots", "accessories", "enchanted style"],
  openGraph: {
    title: "Enchanted Style",
    description: "Curated women's fashion from Lebanon. Where glamour meets edge.",
    type: "website",
    locale: "en_US",
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${dmSans.variable} antialiased`}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  )
}
