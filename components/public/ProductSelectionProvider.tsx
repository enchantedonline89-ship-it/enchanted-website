'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type ProductSelection = {
  productId: string
  colorId: string | null
  setColorId: (colorId: string | null) => void
}

const ProductSelectionContext = createContext<ProductSelection | null>(null)

export function ProductSelectionProvider({ productId, children }: { productId: string; children: ReactNode }) {
  const [colorId, setColorId] = useState<string | null>(null)
  return (
    <ProductSelectionContext.Provider value={{ productId, colorId, setColorId }}>
      {children}
    </ProductSelectionContext.Provider>
  )
}

export function useProductSelection(productId: string) {
  const selection = useContext(ProductSelectionContext)
  return selection?.productId === productId ? selection : null
}
