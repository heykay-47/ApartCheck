import { expect, test, type Page } from '@playwright/test'

async function signOut(page: Page) {
  const logout = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/logout') &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Sign out' }).click()
  await logout
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0)
  await page.goto('/login')
  await expect(page.getByLabel('Email')).toBeVisible()
}

test('admin bootstrap to resident QR scan flow', async ({ page }) => {
  const adminEmail = 'phase-one-admin@example.com'
  const adminPassword = 'Phase-one-admin-password'
  const residentEmail = 'phase-one-resident@example.com'
  const technicianEmail = 'phase-one-technician@example.com'

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
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill(adminEmail)
    await page.getByLabel('Password').fill(adminPassword)
    await page.getByRole('button', { name: 'Sign in' }).click()
  }
  await expect(page).toHaveURL(/dashboard/)
  await expect(
    page.getByRole('link', { name: 'Units', exact: true }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Units', exact: true }).click()
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
  await page.getByLabel('Role', { exact: true }).selectOption('resident')
  await page.getByLabel('Unit').selectOption({ label: 'Tower A / 1 / A-101' })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create account' })
    .click()
  const temporaryPassword = await page
    .locator('input[aria-label="Temporary password"]')
    .inputValue()
  expect(temporaryPassword).toMatch(/^[A-Za-z0-9]{16}$/)
  await page.getByRole('button', { name: 'I have shared it' }).click()

  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByLabel('Name').fill('Phase One Technician')
  await page.getByLabel('Email').fill(technicianEmail)
  await page.getByLabel('Phone').fill('+14155550103')
  await page.getByLabel('Role', { exact: true }).selectOption('technician')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create account' })
    .click()
  await expect(page.getByRole('dialog')).toContainText(
    'Share temporary password',
  )
  const technicianTemporaryPassword = await page
    .locator('input[aria-label="Temporary password"]')
    .inputValue()
  expect(technicianTemporaryPassword).toMatch(/^[A-Za-z0-9]{16}$/)
  await page.getByRole('button', { name: 'I have shared it' }).click()
  await expect(page.getByText(technicianEmail)).toBeVisible()

  await page.getByRole('link', { name: 'Admin assets' }).click()
  await page.getByLabel('Asset name').fill('Phase One Lift')
  await page.getByLabel('Location').fill('Tower A lobby')
  const assetResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/assets') &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Create asset' }).click()
  const createdAsset = await (await assetResponse).json()
  expect(createdAsset.asset).toMatchObject({ name: 'Phase One Lift' })
  expect(createdAsset.asset.id).toEqual(expect.any(String))
  const assetCode = createdAsset.asset.assetCode as string
  expect(assetCode).toMatch(/^LFT-[A-Z2-9]{6}$/)
  await page.goto(`/assets/${createdAsset.asset.id}`)
  await expect(page.getByTestId('identity-plate')).toBeVisible()
  await expect(
    page.getByRole('img', { name: new RegExp(assetCode ?? '') }),
  ).toBeVisible()

  await signOut(page)
  await page.getByLabel('Email').fill(residentEmail)
  await page.getByLabel('Password').fill(temporaryPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/change-password/)

  await page.getByLabel('Current password').fill(temporaryPassword)
  await page.getByLabel('New password').fill('Phase-one-resident-password')
  await page.getByRole('button', { name: 'Save password' }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto(`/tickets/new?assetId=${createdAsset.asset.id}`)
  await page.getByLabel('Title').fill('Lift guide is worn')
  await page
    .getByLabel('Description')
    .fill('The lift guide is worn and needs replacement before further use.')
  await page.getByRole('button', { name: 'Report ticket' }).click()
  await expect(page).toHaveURL(/\/tickets\/[a-f0-9]{24}$/)
  const ticketUrl = page.url()
  await expect(
    page.getByRole('heading', { name: 'Lift guide is worn' }),
  ).toBeVisible()

  await signOut(page)
  await page.getByLabel('Email').fill(adminEmail)
  await page.getByLabel('Password').fill(adminPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto(ticketUrl)
  await page.getByRole('button', { name: 'Assign technician' }).click()
  await page
    .getByRole('dialog', { name: 'Choose technician' })
    .getByLabel('Technician', { exact: true })
    .selectOption({ label: `Phase One Technician — ${technicianEmail}` })
  await page.getByRole('button', { name: 'Save assignment' }).click()
  await expect(page.getByText('assigned', { exact: true })).toBeVisible()

  await signOut(page)
  await page.getByLabel('Email').fill(technicianEmail)
  await page.getByLabel('Password').fill(technicianTemporaryPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/change-password/)
  await page.getByLabel('Current password').fill(technicianTemporaryPassword)
  await page.getByLabel('New password').fill('Phase-two-technician-password')
  await page.getByRole('button', { name: 'Save password' }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto(ticketUrl)
  await page.getByRole('button', { name: 'Start work' }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('in progress', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Submit completion' }).click()
  await page
    .getByLabel('Completion summary')
    .fill('Replaced worn lift-door guide and tested two full cycles.')
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(
    page.getByText('awaiting verification', { exact: true }),
  ).toBeVisible()

  await signOut(page)
  await page.getByLabel('Email').fill(residentEmail)
  await page.getByLabel('Password').fill('Phase-one-resident-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto(ticketUrl)
  await expect(
    page.getByText('awaiting verification', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Verify work' })).toHaveCount(0)

  await signOut(page)
  await page.getByLabel('Email').fill(adminEmail)
  await page.getByLabel('Password').fill(adminPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto(ticketUrl)
  await page.getByRole('button', { name: 'Return for rework' }).click()
  await page
    .getByLabel('Reason')
    .fill('Please retest the guide after replacement.')
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('in progress', { exact: true })).toBeVisible()

  await signOut(page)
  await page.getByLabel('Email').fill(technicianEmail)
  await page.getByLabel('Password').fill('Phase-two-technician-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto(ticketUrl)
  await page.getByRole('button', { name: 'Submit completion' }).click()
  await page
    .getByLabel('Completion summary')
    .fill('Replaced worn lift-door guide and tested two full cycles.')
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(
    page.getByText('awaiting verification', { exact: true }),
  ).toBeVisible()

  await signOut(page)
  await page.getByLabel('Email').fill(adminEmail)
  await page.getByLabel('Password').fill(adminPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto(ticketUrl)
  await page.getByRole('button', { name: 'Verify work' }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('completed', { exact: true })).toBeVisible()

  await signOut(page)
  await page.getByLabel('Email').fill(residentEmail)
  await page.getByLabel('Password').fill('Phase-one-resident-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto('/scan/invalid-token')
  await expect(page.getByText(/asset is unavailable/i)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)
  const mutation = await page.request.patch('/api/assets/invalid-id', {
    data: { name: 'Nope', category: 'lift', locationDescription: 'Nope' },
  })
  expect(mutation.status()).toBe(403)
})
