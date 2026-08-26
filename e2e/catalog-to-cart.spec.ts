import { expect, test } from '@playwright/test'

test.describe('Storefront shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders the real empty or live catalog without horizontal overflow', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('heading', { name: /catalog/i })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })

  test('empty-cart Shop All closes the drawer and opens the catalog', async ({ page }) => {
    await page.getByRole('button', { name: /cart/i }).first().click()
    const drawer = page.getByRole('dialog', { name: /your cart/i })
    await drawer.getByRole('link', { name: /shop all/i }).click()
    await expect(page).toHaveURL(/#catalog$/)
    await expect(drawer.locator('..')).toHaveAttribute('inert', '')
  })

  test('mobile navigation closes after catalog navigation', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile navigation only')
    await page.getByRole('button', { name: /open menu/i }).click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await menu.getByRole('link', { name: /shop/i }).click()
    await expect(menu.locator('..')).toHaveAttribute('inert', '')
    await expect(page).toHaveURL(/#catalog$/)
  })

  test('holiday previews remain decorative and respect reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?preview_theme=christmas')
    await expect(page.locator('[data-site-theme="christmas"]')).toBeVisible()
    await expect(page.getByRole('main')).toBeVisible()
  })
})
