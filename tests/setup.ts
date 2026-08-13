import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'

const isDom = typeof window !== 'undefined'

// ─── jsdom gaps used by the redesigned components ─────────────────────────────
// Guarded: this same setup file also runs for node-environment suites
// (e.g. the /api/orders route tests), which have no window or document.

if (isDom) {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    })
  }

  if (!('IntersectionObserver' in globalThis)) {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        readonly root = null
        readonly rootMargin = ''
        readonly thresholds: readonly number[] = []
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return []
        }
      },
    )
  }

  if (!('ResizeObserver' in globalThis)) {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  }
}

// ─── Per-test isolation ───────────────────────────────────────────────────────

const { cleanup } = isDom
  ? await import('@testing-library/react')
  : { cleanup: () => {} }

// CartDrawer persists a "resume checkout after sign-in" marker in sessionStorage,
// and the cart itself lives in localStorage. Both must be wiped between tests or
// state bleeds forward and a later test starts mid-flow.
function clearStorages() {
  if (!isDom) return
  localStorage.clear()
  sessionStorage.clear()
  document.body.style.overflow = ''
}

beforeEach(clearStorages)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  clearStorages()
})
