import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('key screens have no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/login')
  for (const path of [
    '/login',
    '/dashboard',
    '/admin/units',
    '/admin/users',
    '/assets',
    '/assets/missing',
  ]) {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
    ).toEqual([])
  }
})

test('keyboard navigation works on mobile and desktop, with reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/login')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toBeVisible()
  await page.getByRole('link', { name: 'Start setup' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/setup/)

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/scan/invalid-token')
  const transitionDuration = await page.locator('body').evaluate(() => {
    const scanResult = document.querySelector('[data-testid="scan-result"]')
    return scanResult ? getComputedStyle(scanResult).transitionDuration : '0s'
  })
  expect(transitionDuration).toBe('0s')
})
