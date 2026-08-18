import { expect, test, type Page } from '@playwright/test'

const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

const admin = {
  email: 'phase-one-admin@example.com',
  password: 'Phase-one-admin-password',
}
const resident = {
  email: 'photo-evidence-resident@example.com',
  password: 'Photo-evidence-resident-password',
}
const technician = {
  email: 'photo-evidence-technician@example.com',
  password: 'Photo-evidence-technician-password',
}

async function signOut(page: Page) {
  const logout = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/logout') &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Sign out' }).click()
  await logout
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0)
}

async function login(
  page: Page,
  account: { email: string; password: string },
  newPassword?: string,
) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  if (newPassword) {
    await expect(page).toHaveURL(/change-password/)
    await page.getByLabel('Current password').fill(account.password)
    await page.getByLabel('New password').fill(newPassword)
    await page.getByRole('button', { name: 'Save password' }).click()
  }
  await expect(page).toHaveURL(/dashboard/)
}

async function createAccount(
  page: Page,
  input: {
    name: string
    email: string
    role: 'resident' | 'technician'
    unitLabel?: string
  },
) {
  await page.getByRole('button', { name: 'Create account' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Name').fill(input.name)
  await dialog.getByLabel('Email').fill(input.email)
  await dialog.getByLabel('Phone').fill('+14155550301')
  await dialog.getByLabel('Role', { exact: true }).selectOption(input.role)
  if (input.unitLabel) {
    await dialog.getByLabel('Unit', { exact: true }).selectOption({
      label: input.unitLabel,
    })
  }
  await dialog.getByRole('button', { name: 'Create account' }).click()
  const temporaryPassword = await page
    .locator('input[aria-label="Temporary password"]')
    .inputValue()
  expect(temporaryPassword).toMatch(/^[A-Za-z0-9]{16}$/)
  await page.getByRole('button', { name: 'I have shared it' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  return temporaryPassword
}

test('resident report to verified immutable Ticket photo attempts', async ({
  page,
}) => {
  const cloudinaryRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('cloudinary'))
      cloudinaryRequests.push(request.url())
  })
  await page.route('https://images.example.test/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: VALID_PNG }),
  )

  await page.goto('/setup')
  if (
    await page.getByRole('heading', { name: /set up your society/i }).count()
  ) {
    await page.getByLabel('Society name').fill('Ticket Photo Evidence Society')
    await page.getByLabel('Address').fill('Ticket Photo Evidence Address')
    await page.getByLabel('Administrator name').fill('Photo Evidence Admin')
    await page.getByLabel('Email').fill(admin.email)
    await page.getByLabel('Phone').fill('+14155550300')
    await page.getByLabel('Password').fill(admin.password)
    await page.getByRole('button', { name: 'Create society' }).click()
    await expect(page).toHaveURL(/dashboard/)
  } else {
    await login(page, admin)
  }

  await page.getByRole('link', { name: 'Units', exact: true }).click()
  await page.getByLabel('Building').fill('Tower Photo')
  await page.getByLabel('Floor').fill('2')
  await page.getByLabel('Unit number').fill('P-201')
  await page.getByRole('button', { name: 'Create unit' }).click()
  await expect(page.getByText('Unit created')).toBeVisible()

  const unitLabel = 'Tower Photo / 2 / P-201'
  await page.getByRole('link', { name: 'Users' }).click()
  const residentTemporaryPassword = await createAccount(page, {
    name: 'Photo Evidence Resident',
    email: resident.email,
    role: 'resident',
    unitLabel,
  })
  const technicianTemporaryPassword = await createAccount(page, {
    name: 'Photo Evidence Technician',
    email: technician.email,
    role: 'technician',
  })

  await signOut(page)
  await login(
    page,
    { ...resident, password: residentTemporaryPassword },
    resident.password,
  )
  await page.goto('/tickets/new')
  await page.getByLabel('Title').fill('Lift guide needs completion proof')
  await page
    .getByLabel('Description')
    .fill('The lift guide was repaired and needs documented completion proof.')
  await page.getByRole('button', { name: 'Report ticket' }).click()
  await expect(page).toHaveURL(/\/tickets\/[a-f0-9]{24}$/)
  const ticketUrl = page.url()
  await expect(
    page.getByRole('heading', { name: 'Lift guide needs completion proof' }),
  ).toBeVisible()

  await signOut(page)
  await login(page, admin)
  await page.goto(ticketUrl)
  await page.getByRole('button', { name: 'Assign technician' }).click()
  const assignment = page.getByRole('dialog')
  await assignment.getByLabel('Technician', { exact: true }).selectOption({
    label: `Photo Evidence Technician — ${technician.email}`,
  })
  await assignment
    .getByLabel('Required photos', { exact: true })
    .selectOption('2')
  await assignment.getByRole('button', { name: 'Save assignment' }).click()
  await expect(page.getByText('assigned', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Photo requirement' }),
  ).toBeVisible()
  await expect(page.getByLabel('Required photos', { exact: true })).toHaveValue(
    '2',
  )

  await signOut(page)
  await login(
    page,
    { ...technician, password: technicianTemporaryPassword },
    technician.password,
  )
  await page.goto(ticketUrl)
  await page.getByRole('button', { name: 'Start work' }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('in progress', { exact: true })).toBeVisible()

  await page.getByLabel('Completion photos').setInputFiles({
    name: 'repair-proof.png',
    mimeType: 'image/png',
    buffer: VALID_PNG,
  })
  await expect(page.getByText('repair-proof.png uploaded.')).toBeVisible()
  await expect(page.getByText('1 active photo')).toBeVisible()
  await expect(page.getByText('1 more photo required')).toBeVisible()

  await page.getByRole('button', { name: 'Submit completion' }).click()
  const blockedSubmission = page.getByRole('dialog')
  await expect(blockedSubmission).toContainText('1 more photo required')
  await expect(
    blockedSubmission.getByRole('button', { name: 'Confirm submission' }),
  ).toBeDisabled()
  await blockedSubmission.getByRole('button', { name: 'Cancel' }).click()
  await expect(
    page.getByRole('button', { name: 'Submit completion' }),
  ).toBeFocused()

  await page.getByLabel('Completion photos').setInputFiles({
    name: 'repair-proof-second.png',
    mimeType: 'image/png',
    buffer: VALID_PNG,
  })
  await expect(
    page.getByText('repair-proof-second.png uploaded.'),
  ).toBeVisible()
  await expect(page.getByText('Photo requirement met.')).toBeVisible()
  await page.getByRole('button', { name: 'Submit completion' }).click()
  const firstSubmission = page.getByRole('dialog')
  await firstSubmission
    .getByLabel('Completion summary')
    .fill('Repaired the lift guide and tested two complete cycles.')
  await firstSubmission
    .getByRole('button', { name: 'Confirm submission' })
    .click()
  await expect(
    page.getByText('awaiting verification', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'Submission attempt 1 — Awaiting verification',
    }),
  ).toBeVisible()

  await signOut(page)
  await login(page, admin)
  await page.goto(ticketUrl)
  await page.getByRole('button', { name: 'Return for rework' }).click()
  await page
    .getByLabel('Reason')
    .fill('Add a second completion attempt after checking the guide again.')
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('in progress', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Submission attempt 1 — Returned' }),
  ).toBeVisible()

  await signOut(page)
  await login(page, technician)
  await page.goto(ticketUrl)
  await page.getByLabel('Completion photos').setInputFiles([
    {
      name: 'repair-proof-returned.png',
      mimeType: 'image/png',
      buffer: VALID_PNG,
    },
    {
      name: 'repair-proof-returned-second.png',
      mimeType: 'image/png',
      buffer: VALID_PNG,
    },
  ])
  await expect(page.getByText('2 active photos')).toBeVisible()
  await page.getByRole('button', { name: 'Submit completion' }).click()
  const secondSubmission = page.getByRole('dialog')
  await secondSubmission
    .getByLabel('Completion summary')
    .fill('Rechecked the lift guide and documented the corrected alignment.')
  await secondSubmission
    .getByRole('button', { name: 'Confirm submission' })
    .click()
  await expect(
    page.getByText('awaiting verification', { exact: true }),
  ).toBeVisible()

  await signOut(page)
  await login(page, admin)
  await page.goto(ticketUrl)
  await expect(
    page.getByRole('heading', { name: 'Submission attempt 1 — Returned' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'Submission attempt 2 — Awaiting verification',
    }),
  ).toBeVisible()

  await page
    .getByRole('button', {
      name: 'View evidence photo 1 from submission attempt 1',
    })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByRole('img', {
      name: 'Evidence photo 1 from submission attempt 1',
    }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Close photo' }).click()

  await page.getByRole('button', { name: 'Verify work' }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('completed', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Submission attempt 1 — Returned' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'Submission attempt 2 — Verified',
    }),
  ).toBeVisible()
  await expect(cloudinaryRequests).toEqual([])
})
