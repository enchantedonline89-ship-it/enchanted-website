import Navbar from "@/components/public/Navbar"
import Hero from "@/components/public/Hero"
import NewArrivals from "@/components/public/NewArrivals"
import ProductGrid from "@/components/public/ProductGrid"
import Footer from "@/components/public/Footer"
import CustomCursor from "@/components/public/CustomCursor"
import WhatsAppFloat from "@/components/public/WhatsAppFloat"
import CartDrawer from "@/components/public/CartDrawer"
import { Product, Category } from "@/types"
import { mockProducts, mockCategories, isSupabaseMockMode } from "@/lib/mock-data"

export const revalidate = 3600

export default async function HomePage() {
  let products: Product[] = []
  let categories: Category[] = []

  if (isSupabaseMockMode()) {
    // Preview mode — no Supabase configured yet
    products = mockProducts
    categories = mockCategories
  } else {
    // Production mode — fetch from Supabase
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    const [{ data: dbProducts }, { data: dbCategories }] = await Promise.all([
      supabase
        .from("products")
        .select("*, category:categories(id, name, slug)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ])

    products = (dbProducts ?? []) as Product[]
    categories = (dbCategories ?? []) as Category[]
  }

  // 5 most recently added active products for New Arrivals
  const newArrivals = [...products]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <>
      <CustomCursor />
      <Navbar />

      <main>
        <Hero />
        <NewArrivals products={newArrivals} />
        <ProductGrid products={products} categories={categories} />

        {/* About section */}
        <section id="about" className="py-24 px-4 max-w-4xl mx-auto text-center">
          <p className="text-gold text-xs tracking-[0.4em] uppercase mb-4">Our Story</p>
          <h2 className="font-display text-4xl lg:text-5xl text-foreground mb-6 leading-tight">
            Fashion is not just clothing.<br />
            <span className="text-gold-gradient italic">It&apos;s a statement.</span>
          </h2>
          <div className="section-divider mb-8" />
          <p className="text-muted text-lg leading-relaxed max-w-2xl mx-auto">
            Enchanted Style was born from a passion for curating the most captivating women&apos;s
            fashion in Lebanon. Every piece in our collection is handpicked for women who refuse
            to be ordinary — who wear glamour not just as clothing, but as armour.
          </p>
          <a
            href="https://www.instagram.com/enchanted.style_"
            target="_blank"
            rel="noopener noreferrer"
            data-hover
            className="inline-flex items-center gap-2 mt-8 text-gold text-sm tracking-widest uppercase hover:text-gold-light transition-colors"
          >
            Follow us @enchanted.style_
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </a>
        </section>
      </main>

      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
    </>
  )
}
