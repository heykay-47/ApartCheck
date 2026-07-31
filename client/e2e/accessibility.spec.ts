import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const admin = {
  email: 'a11y-admin@example.com',
  password: 'A11y-admin-password',
}

async function authenticateAdmin(page: Page) {
  await page.goto('/setup')
  if (
    await page.getByRole('heading', { name: /set up your society/i }).count()
  ) {
    await page.getByLabel('Society name').fill('A11y Society')
    await page.getByLabel('Address').fill('A11y Address')
    await page.getByLabel('Administrator name').fill('A11y Admin')
    await page.getByLabel('Email').fill(admin.email)
    await page.getByLabel('Phone').fill('+14155550201')
    await page.getByLabel('Password').fill(admin.password)
    await page.getByRole('button', { name: 'Create society' }).click()
  }
  await page.goto('/login')
  await assertA11y(page)
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill(admin.email)
    await page.getByLabel('Password').fill(admin.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
  }
  await expect(page).toHaveURL(/dashboard/)
  await expect(
    page.getByRole('link', { name: 'Units', exact: true }),
  ).toBeVisible()
}

async function exerciseKeyboardInteractions(
  page: Page,
  viewport: { width: number; height: number },
  suffix: string,
) {
  await page.setViewportSize(viewport)
  await page.goto('/dashboard')

  const skipLink = page.getByRole('link', { name: 'Skip to main content' })
  await expect(skipLink).toBeAttached()
  await page.keyboard.press('Tab')
  await expect(skipLink).toBeFocused()
  await expect(skipLink).toBeVisible()
  await skipLink.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()

  if (viewport.width < 768) {
    const menu = page.locator('.mobile-nav summary')
    await menu.focus()
    await menu.press('Enter')
    await expect(page.locator('.mobile-nav')).toHaveAttribute('open', '')
    await assertVisibleFocus(page, '.mobile-nav summary')
    await menu.press('Enter')
    await expect(page.locator('.mobile-nav')).not.toHaveAttribute('open', '')
  } else {
    const unitsLink = page.getByRole('link', { name: 'Units', exact: true })
    await unitsLink.focus()
    await assertVisibleFocus(page, '.utility-spine a[href="/admin/units"]')
    await unitsLink.press('Enter')
    await expect(page).toHaveURL(/admin\/units/)
  }

  await page.goto('/admin/units')

  await page.getByLabel('Building').fill(`A11y Tower ${suffix}`)
  await page.getByLabel('Floor').fill('1')
  await page.getByLabel('Unit number').fill(`A-${suffix}`)
  await page.getByLabel('Unit number').focus()
  await assertVisibleFocus(page, 'input:focus')
  await page.getByLabel('Unit number').press('Enter')
  await expect(page.getByText('Unit created')).toBeVisible()

  await page.goto('/admin/users')
  await page.getByRole('button', { name: 'Create account' }).focus()
  await assertVisibleFocus(page, 'button:has-text("Create account")')
  await page.getByRole('button', { name: 'Create account' }).press('Enter')
  const accountDialog = page.getByRole('dialog', { name: 'Create account' })
  await expect(accountDialog).toBeVisible()
  await assertA11y(page)
  await accountDialog.getByRole('button', { name: 'Cancel' }).focus()
  await assertVisibleFocus(page, 'dialog button:has-text("Cancel")')
  await accountDialog.getByRole('button', { name: 'Cancel' }).press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function assertA11y(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([])
}

async function assertVisibleFocus(page: Page, selector: string) {
  const control = page.locator(selector)
  await expect(control).toBeVisible()
  await expect(control).toBeFocused()
  await expect
    .poll(() =>
      control.evaluate((element) => getComputedStyle(element).outlineStyle),
    )
    .not.toBe('none')
}

test('admin screens pass axe and keyboard quality gates at both viewports', async ({
  page,
}) => {
  await authenticateAdmin(page)

  await exerciseKeyboardInteractions(page, { width: 360, height: 800 }, '201')
  await exerciseKeyboardInteractions(page, { width: 1440, height: 900 }, '202')

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/admin/assets')
  await page.getByLabel('Asset name').fill('A11y Lift')
  await page.getByLabel('Location').fill('A11y lobby')
  const assetResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/assets') &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Create asset' }).press('Enter')
  const createdAsset = await (await assetResponse).json()
  expect(createdAsset.asset).toMatchObject({ name: 'A11y Lift' })
  expect(createdAsset.asset.id).toEqual(expect.any(String))

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard')
  await assertA11y(page)
  await page.goto('/admin/units')
  await assertA11y(page)
  await page.goto('/admin/users')
  await assertA11y(page)
  await page.goto('/assets')
  await assertA11y(page)
  await page.goto(`/assets/${createdAsset.asset.id}`)
  await expect(page.getByTestId('identity-plate')).toBeVisible()
  await assertA11y(page)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const transition = await page
    .getByTestId('identity-plate')
    .evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        duration: style.transitionDuration,
        testId: element.dataset.testid,
      }
    })
  expect(transition).toEqual({ duration: '0s', testId: 'identity-plate' })

  for (const selector of [
    'a:has-text("Back to ledger")',
    'button:has-text("Edit asset")',
    'button:has-text("Print asset label")',
  ]) {
    const control = page.locator(selector).first()
    await control.focus()
    await assertVisibleFocus(page, selector)
  }
})
