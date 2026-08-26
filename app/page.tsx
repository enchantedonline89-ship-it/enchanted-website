import Navbar from "@/components/public/Navbar"
import Hero from "@/components/public/Hero"
import HeroCanvas from "@/components/three/HeroCanvas"
import DeliveryBand from "@/components/public/DeliveryBand"
import NewArrivals from "@/components/public/NewArrivals"
import ProductGrid from "@/components/public/ProductGrid"
import Footer from "@/components/public/Footer"
import WhatsAppFloat from "@/components/public/WhatsAppFloat"
import CartDrawer from "@/components/public/CartDrawer"
import CatalogItemListJsonLd from "@/components/seo/CatalogItemListJsonLd"
import { getCatalog } from "@/lib/catalog"
import PromotionBanner from "@/components/public/PromotionBanner"

export const revalidate = 300

export default async function HomePage() {
  const { products, categories, promotions, source } = await getCatalog()

  const newArrivals = [...products]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  return (
    <>
      <CatalogItemListJsonLd products={products} live={source === "live"} />
      <Navbar />

      <main id="main" className="pt-[68px]">
        <PromotionBanner promotions={promotions} />
        <Hero visual={<HeroCanvas />} />
        <DeliveryBand />
        <NewArrivals products={newArrivals} />
        <ProductGrid
          products={products}
          categories={categories}
          unavailable={source === "unavailable"}
        />
      </main>

      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
    </>
  )
}
