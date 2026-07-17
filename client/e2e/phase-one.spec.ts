import { expect, test } from '@playwright/test'

test('admin bootstrap to resident QR scan flow', async ({ page }) => {
  const adminEmail = 'phase-one-admin@example.com'
  const adminPassword = 'Phase-one-admin-password'
  const residentEmail = 'phase-one-resident@example.com'

  await page.goto('/setup')
  await expect(
    page.getByRole('heading', { name: /set up your society/i }),
  ).toBeVisible()
  await page.getByLabel('Society name').fill('Phase One Society')
  await page.getByLabel('Address').fill('Phase One Address')
  await page.getByLabel('Administrator name').fill('Phase One Admin')
  await page.getByLabel('Email').fill(adminEmail)
  await page.getByLabel('Phone').fill('+14155550101')
  await page.getByLabel('Password').fill(adminPassword)
  await page.getByRole('button', { name: 'Create society' }).click()
  await expect(page).toHaveURL(/dashboard/)

  await page.getByRole('link', { name: 'Units' }).click()
  await page.getByLabel('Building').fill('Tower A')
  await page.getByLabel('Floor').fill('1')
  await page.getByLabel('Unit number').fill('A-101')
  await page.getByRole('button', { name: 'Create unit' }).click()
  await expect(page.getByText('Unit created')).toBeVisible()

  await page.getByRole('link', { name: 'Users' }).click()
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByLabel('Name').fill('Phase One Resident')
  await page.getByLabel('Email').fill(residentEmail)
  await page.getByLabel('Phone').fill('+14155550102')
  await page.getByLabel('Role').selectOption('resident')
  await page.getByLabel('Unit').selectOption({ label: /A-101/ })
  await page.getByRole('button', { name: 'Create account' }).click()
  const temporaryPassword = await page
    .getByLabel('Temporary password')
    .inputValue()
  expect(temporaryPassword).toMatch(/^[A-Za-z0-9]{16}$/)
  await page.getByRole('button', { name: 'I have shared it' }).click()

  await page.getByRole('link', { name: 'Admin assets' }).click()
  await page.getByLabel('Name').fill('Phase One Lift')
  await page.getByLabel('Location description').fill('Tower A lobby')
  await page.getByRole('button', { name: 'Create asset' }).click()
  await expect(page.getByText(/LFT-[A-Z2-9]{6}/)).toBeVisible()
  const assetCode = await page
    .locator('[data-asset-code]')
    .getAttribute('data-asset-code')
  expect(assetCode).toMatch(/^LFT-[A-Z2-9]{6}$/)
  await expect(
    page.getByRole('img', { name: new RegExp(assetCode ?? '') }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByLabel('Email').fill(residentEmail)
  await page.getByLabel('Password').fill(temporaryPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/change-password/)
  await page.getByLabel('Current password').fill(temporaryPassword)
  await page.getByLabel('New password').fill('Phase-one-resident-password')
  await page.getByRole('button', { name: 'Save password' }).click()
  await expect(page).toHaveURL(/dashboard/)

  await page.goto('/scan/invalid-token')
  await expect(page.getByText(/asset is unavailable/i)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)
  const mutation = await page.request.patch('/api/assets/invalid-id', {
    data: { name: 'Nope', category: 'lift', locationDescription: 'Nope' },
  })
  expect(mutation.status()).toBe(403)
})
