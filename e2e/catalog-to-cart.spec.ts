import { expect, test } from '@playwright/test'

/**
 * Catalog → cart, against the mock catalogue in lib/mock-data.ts.
 * Requires `npx playwright install chromium` and a running dev server.
 */

test.describe('Catalog and cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('a sized product cannot be added without choosing a size', async ({ page }) => {
    const card = page.locator('article').filter({ hasText: 'Velvet Gold-Strap Stiletto' }).first()
    await card.getByRole('button', { name: /add to cart/i }).click()

    await expect(card.getByRole('alert')).toHaveText(/pick a size first/i)
  })

  test('choosing a size then adding puts the line in the cart', async ({ page }) => {
    const card = page.locator('article').filter({ hasText: 'Velvet Gold-Strap Stiletto' }).first()
    await card.getByRole('group', { name: /choose a size/i }).getByRole('button', { name: '38' }).click()
    await card.getByRole('button', { name: /add to cart/i }).click()

    await expect(card.getByRole('button', { name: /added/i })).toBeVisible()

    await page.getByRole('button', { name: /cart/i }).first().click()
    const drawer = page.getByRole('dialog', { name: /your cart/i })
    await expect(drawer.getByText('Velvet Gold-Strap Stiletto')).toBeVisible()
    await expect(drawer.getByText('Size 38')).toBeVisible()
  })

  test('an accessory with no sizes adds straight away', async ({ page }) => {
    const card = page.locator('article').filter({ hasText: 'Crystal Hair Claw Clip' }).first()
    await expect(card.getByRole('group', { name: /choose a size/i })).toHaveCount(0)

    await card.getByRole('button', { name: /add to cart/i }).click()
    await expect(card.getByRole('button', { name: /added/i })).toBeVisible()
  })

  test('the cart survives a page reload', async ({ page }) => {
    const card = page.locator('article').filter({ hasText: 'Crystal Hair Claw Clip' }).first()
    await card.getByRole('button', { name: /add to cart/i }).click()
    await expect(card.getByRole('button', { name: /added/i })).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: /cart/i }).first().click()

    await expect(
      page.getByRole('dialog', { name: /your cart/i }).getByText('Crystal Hair Claw Clip'),
    ).toBeVisible()
  })

  test('delivery area drives the fee shown in the cart', async ({ page }) => {
    const card = page.locator('article').filter({ hasText: 'Crystal Hair Claw Clip' }).first()
    await card.getByRole('button', { name: /add to cart/i }).click()
    await page.getByRole('button', { name: /cart/i }).first().click()

    const drawer = page.getByRole('dialog', { name: /your cart/i })
    await expect(drawer.getByRole('button', { name: /continue to delivery details/i })).toBeDisabled()

    await drawer.getByRole('button', { name: /^Beirut/ }).click()
    await expect(drawer.getByText('$3.00')).toBeVisible()

    await drawer.getByRole('button', { name: /^Outside Beirut/ }).click()
    await expect(drawer.getByText('$4.00')).toBeVisible()
    await expect(drawer.getByLabel(/town or city/i)).toBeVisible()
  })

  test('checkout is gated behind sign-in for a signed-out visitor', async ({ page }) => {
    const card = page.locator('article').filter({ hasText: 'Crystal Hair Claw Clip' }).first()
    await card.getByRole('button', { name: /add to cart/i }).click()
    await page.getByRole('button', { name: /cart/i }).first().click()

    const drawer = page.getByRole('dialog', { name: /your cart/i })
    await drawer.getByRole('button', { name: /^Beirut/ }).click()
    await drawer.getByRole('button', { name: /continue to delivery details/i }).click()

    await expect(page.getByRole('dialog', { name: /sign in to order/i })).toBeVisible()
  })

  test('mobile hash navigation closes the menu drawer', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile navigation only')
    await page.getByRole('button', { name: /open menu/i }).click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await expect(menu).toBeVisible()
    await menu.getByRole('link', { name: 'Shop' }).click()
    await expect(menu).toBeHidden()
    await expect(page).toHaveURL(/#catalog$/)
  })
})
