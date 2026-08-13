import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const root = path.resolve(import.meta.dirname)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Mirrors the tsconfig "@/*" -> "./*" path mapping.
      // Regex form so it never swallows scoped packages like @testing-library/react.
      { find: /^@\//, replacement: `${root}/` },
      // next/image and next/link need the Next.js runtime; swap them for plain
      // <img> / <a> in tests.
      { find: /^next\/image$/, replacement: path.resolve(root, 'tests/stubs/next-image.tsx') },
      { find: /^next\/link$/, replacement: path.resolve(root, 'tests/stubs/next-link.tsx') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'coverage', 'e2e'],
    testTimeout: 10_000,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'lib/cart-context.tsx',
        'lib/whatsapp.ts',
        'app/api/orders/route.ts',
        'components/public/ProductCard.tsx',
        'components/public/CartDrawer.tsx',
      ],
    },
  },
})
