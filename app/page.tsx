import Image from "next/image"
import Navbar from "@/components/public/Navbar"
import Hero from "@/components/public/Hero"
import HeroCanvas from "@/components/three/HeroCanvas"
import DeliveryBand from "@/components/public/DeliveryBand"
import NewArrivals from "@/components/public/NewArrivals"
import ProductGrid from "@/components/public/ProductGrid"
import Reveal from "@/components/public/Reveal"
import Footer from "@/components/public/Footer"
import WhatsAppFloat from "@/components/public/WhatsAppFloat"
import CartDrawer from "@/components/public/CartDrawer"
import CatalogItemListJsonLd from "@/components/seo/CatalogItemListJsonLd"
import { getCatalog } from "@/lib/catalog"

export const revalidate = 3600

export default async function HomePage() {
  const { products, categories, source } = await getCatalog()

  const newArrivals = [...products]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  return (
    <>
      <CatalogItemListJsonLd products={products} />
      <Navbar />

      <main id="main">
        <Hero visual={<HeroCanvas />} />
        <DeliveryBand />
        <NewArrivals products={newArrivals} />
        <ProductGrid
          products={products}
          categories={categories}
          unavailable={source === "unavailable"}
        />

        {/* Asymmetric split. Used once on the page. */}
        <section id="story" className="scroll-mt-[68px] border-t border-line">
          <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-stretch lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative aspect-[4/5] w-full lg:aspect-auto lg:min-h-[38rem]">
              <Image
                src="/catalog/1512374382149-23.jpg"
                alt="Footwear photographed on a dark concrete floor"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
                style={{ filter: "brightness(0.88) saturate(0.85)" }}
              />
            </div>

            <Reveal className="flex flex-col justify-center px-5 py-16 lg:px-16 lg:py-24">
              <h2 className="t-section max-w-[16ch] text-ink">
                Curated in Beirut, one piece at a time.
              </h2>
              <p className="t-body mt-7">
                Enchanted Style started as an Instagram feed and turned into a small
                shop with a clear brief: find the pieces women here actually want to
                wear out, and get them to the door without a card form standing in the
                way. Every item is chosen by hand, in sizes that run true.
              </p>
              <p className="t-body mt-5">
                New arrivals land most weeks. If something sells out in your size,
                message us and we will tell you honestly whether it is coming back.
              </p>
              <div className="mt-9">
                <a
                  href="https://www.instagram.com/enchanted.style_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  Follow the feed
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
    </>
  )
}
