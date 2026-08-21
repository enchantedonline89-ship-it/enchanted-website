import { expect, test } from '@playwright/test'

const sections = [
  ['Products', 'products'],
  ['Categories', 'categories'],
  ['Orders', 'orders'],
  ['Analytics', 'analytics'],
  ['Discounts', 'discounts'],
  ['Events', 'events'],
  ['Appearance', 'appearance'],
] as const

const viewportWidths = [375, 390, 768, 820, 1024, 1440] as const

async function expectNoPageOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

test.describe('read-only admin demo', () => {
  test('each navigation tab opens its own screen', async ({ page }) => {
    await page.goto('/admin/demo')
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()

    for (const [label, tab] of sections) {
      await page.getByRole('navigation', { name: 'Demo admin sections' })
        .filter({ visible: true })
        .getByRole('link', { name: label, exact: true })
        .click()

      await expect(page).toHaveURL(new RegExp(`[?&]tab=${tab}(?:&|$)`))
      await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible()
    }
  })

  test('uses the same order-number and status vocabulary as the real shop', async ({ page }) => {
    await page.goto('/admin/demo?tab=orders')

    const references = await page.locator('tbody tr td:first-child').allTextContents()
    expect(references).not.toHaveLength(0)
    for (const reference of references) expect(reference).toMatch(/^ES-\d{4}-\d{6}$/)

    await expect(page.getByText('Delivered', { exact: true })).toBeVisible()
    await expect(page.getByText('Completed', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Shipped', { exact: true })).toHaveCount(0)
  })

})

test.describe('seasonal storefront preview', () => {
  test('renders Christmas and Ramadan decoration without publishing a setting', async ({ page }) => {
    await page.goto('/?preview_theme=christmas')
    await expect(page.locator('.site-theme-root')).toHaveAttribute('data-site-theme', 'christmas')
    await expect(page.locator('.seasonal-snow')).toHaveCount(1)

    await page.goto('/?preview_theme=ramadan')
    await expect(page.locator('.site-theme-root')).toHaveAttribute('data-site-theme', 'ramadan')
    await expect(page.locator('.seasonal-ramadan-ornament')).toHaveCount(1)
  })
})

for (const width of viewportWidths) {
  test(`${width}px storefront, cart, themes, and admin stay within the viewport`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one browser is enough for the width matrix')
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1024 })

    await page.goto('/')
    await expectNoPageOverflow(page)
    await page.getByRole('button', { name: /cart/i }).first().click()
    const cart = page.getByRole('dialog', { name: /your cart/i })
    await expect(cart.getByRole('link', { name: /shop all/i })).toBeVisible()
    await cart.getByRole('link', { name: /shop all/i }).click()
    await expect(page).toHaveURL(/#catalog$/)
    await expectNoPageOverflow(page)

    for (const theme of ['christmas', 'ramadan'] as const) {
      await page.goto(`/?preview_theme=${theme}`)
      await expect(page.locator('.site-theme-root')).toHaveAttribute('data-site-theme', theme)
      await expectNoPageOverflow(page)
    }

    await page.goto('/admin/demo')
    await expectNoPageOverflow(page)
    const demoNav = page.getByRole('navigation', { name: 'Demo admin sections' })
      .filter({ visible: true })
    const demoLinks = demoNav.getByRole('link')
    await expect(demoLinks).toHaveCount(8)
    for (const link of await demoLinks.all()) await expect(link).toBeVisible()

    for (const [, tab] of sections) {
      await page.goto(`/admin/demo?tab=${tab}`)
      await expectNoPageOverflow(page)
    }
  })
}
