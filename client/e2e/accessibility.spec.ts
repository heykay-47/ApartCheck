import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const admin = {
  email: 'a11y-admin@example.com',
  password: 'A11y-admin-password',
}
const technician = {
  email: 'a11y-technician@example.com',
  password: 'A11y-technician-password',
}
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

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
    await expect(page).toHaveURL(/dashboard/)
  }
  await page.context().clearCookies()
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

async function assertVisibleFocusWithin(
  page: Page,
  focusSelector: string,
  containerSelector: string,
) {
  const control = page.locator(focusSelector)
  const container = page.locator(containerSelector)
  await expect(control).toBeFocused()
  await expect(container).toBeVisible()
  await expect
    .poll(() =>
      container.evaluate((element) => getComputedStyle(element).outlineStyle),
    )
    .not.toBe('none')
}

async function assertNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true)
}

async function createTechnician(page: Page) {
  await page.goto('/admin/users')
  await page.getByRole('button', { name: 'Create account' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name').fill('A11y Technician')
  await dialog.getByLabel('Email').fill(technician.email)
  await dialog.getByLabel('Phone').fill('+14155550203')
  await dialog.getByLabel('Role', { exact: true }).selectOption('technician')
  await dialog.getByRole('button', { name: 'Create account' }).click()
  const temporaryPassword = await page
    .locator('input[aria-label="Temporary password"]')
    .inputValue()
  expect(temporaryPassword).toMatch(/^[A-Za-z0-9]{16}$/)
  await page.getByRole('button', { name: 'I have shared it' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  return temporaryPassword
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
  email: string,
  password: string,
  newPassword?: string,
) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  if (newPassword) {
    await expect(page).toHaveURL(/change-password/)
    await page.getByLabel('Current password').fill(password)
    await page.getByLabel('New password').fill(newPassword)
    await page.getByRole('button', { name: 'Save password' }).click()
  }
  await expect(page).toHaveURL(/dashboard/)
}

test('public landing page passes responsive and keyboard quality gates', async ({
  page,
}) => {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(
      page.getByRole('heading', {
        name: 'Every repair. One accountable record.',
      }),
    ).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
    await assertA11y(page)

    const skipLink = page.getByRole('link', {
      name: 'Skip to landing content',
    })
    await page.keyboard.press('Tab')
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeVisible()
    await skipLink.press('Enter')
    await expect(page.locator('#landing-content')).toBeFocused()

    const productLink = page.getByRole('link', { name: 'Product', exact: true })
    await productLink.click()
    await expect(page).toHaveURL(/#product-tour$/)
    const anchorPosition = await page
      .locator('#product-tour')
      .evaluate((element) => {
        const header = document.querySelector('.landing-masthead')
        return {
          targetTop: element.getBoundingClientRect().top,
          headerBottom: header?.getBoundingClientRect().bottom ?? 0,
        }
      })
    expect(anchorPosition.targetTop).toBeGreaterThanOrEqual(
      anchorPosition.headerBottom - 1,
    )

    const source = page.getByRole('link', { name: 'GitHub source' }).first()
    let reachedSource = false
    for (let index = 0; index < 30 && !reachedSource; index += 1) {
      await page.keyboard.press('Tab')
      reachedSource = await source.evaluate(
        (element) => element === document.activeElement,
      )
    }
    expect(reachedSource).toBe(true)
    await assertVisibleFocus(page, '.landing-footer-link')
  }

  const revealTarget = page.locator('[data-reveal]').first()
  await expect(revealTarget).toHaveClass(/is-visible/)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reducedDuration = await revealTarget.evaluate((element) => {
    const duration = getComputedStyle(element).transitionDuration
    return duration.endsWith('ms')
      ? Number.parseFloat(duration)
      : Number.parseFloat(duration) * 1000
  })
  expect(reducedDuration).toBe(0.01)

  const revealCount = await page.locator('[data-reveal]').count()
  expect(revealCount).toBeGreaterThan(0)
  await expect
    .poll(() =>
      page.locator('[data-reveal]').evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element)
          return { opacity: style.opacity, transform: style.transform }
        }),
      ),
    )
    .toEqual(
      Array.from({ length: revealCount }, () => ({
        opacity: '1',
        transform: 'none',
      })),
    )
})

test('admin screens pass axe and keyboard quality gates at both viewports', async ({
  page,
}) => {
  await authenticateAdmin(page)
  await page.route('https://images.example.test/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: VALID_PNG }),
  )

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard')
  const utilityWordmarkColors = await page
    .locator('.utility-spine .brand-mark')
    .evaluate((element) => {
      const wordmark = getComputedStyle(element)
      const spine = getComputedStyle(element.closest('.utility-spine')!)
      return { background: spine.backgroundColor, text: wordmark.color }
    })
  expect(utilityWordmarkColors).toEqual({
    background: 'rgb(32, 52, 59)',
    text: 'rgb(251, 252, 248)',
  })

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
  const technicianTemporaryPassword = await createTechnician(page)

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

  await page.goto(`/tickets/new?assetId=${createdAsset.asset.id}`)
  await page
    .getByLabel('Unit', { exact: true })
    .selectOption({ label: 'A11y Tower 201 / 1 / A-201' })
  await page.getByLabel('Title').fill('A11y ticket')
  await page
    .getByLabel('Description')
    .fill('A ticket description long enough for the workflow.')
  await page.getByRole('button', { name: 'Report ticket' }).click()
  await expect(page).toHaveURL(/\/tickets\/[a-f0-9]{24}$/)
  const ticketUrl = page.url()
  await expect(page.getByRole('heading', { name: 'A11y ticket' })).toBeVisible()
  await assertA11y(page)
  await assertNoHorizontalOverflow(page)
  await page.keyboard.press('Tab')
  await page.getByRole('button', { name: 'Assign technician' }).focus()
  await assertVisibleFocus(page, 'button:has-text("Assign technician")')
  await page.getByRole('button', { name: 'Assign technician' }).press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await assertA11y(page)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Assign technician' }),
  ).toBeFocused()

  await page.getByRole('button', { name: 'Assign technician' }).click()
  const assignment = page.getByRole('dialog')
  await assignment
    .getByLabel('Technician', { exact: true })
    .selectOption({ label: `A11y Technician — ${technician.email}` })
  await assignment
    .getByLabel('Required photos', { exact: true })
    .selectOption('2')
  await assignment.getByRole('button', { name: 'Save assignment' }).click()
  await expect(page.getByText('assigned', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Photo requirement' }),
  ).toBeVisible()

  const requirement = page.getByLabel('Required photos', { exact: true })
  await requirement.focus()
  await assertVisibleFocus(page, 'select:focus')
  await requirement.press('Home')
  await requirement.press('ArrowDown')
  await page
    .getByRole('button', { name: 'Save photo requirement' })
    .press('Enter')
  await expect(page.getByText('Photo requirement saved.')).toBeVisible()

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 360, height: 800 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto(ticketUrl)
    await assertA11y(page)
    await assertNoHorizontalOverflow(page)
    const control = page.getByLabel('Required photos', { exact: true })
    await control.focus()
    await assertVisibleFocus(page, 'select:focus')
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await signOut(page)
  await login(
    page,
    technician.email,
    technicianTemporaryPassword,
    technician.password,
  )
  await page.goto(ticketUrl)
  await page.getByRole('button', { name: 'Start work' }).focus()
  await assertVisibleFocus(page, 'button:has-text("Start work")')
  await page.getByRole('button', { name: 'Start work' }).press('Enter')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm' })
    .press('Enter')
  await expect(page.getByText('in progress', { exact: true })).toBeVisible()

  for (const [index, viewport] of [
    { width: 1440, height: 900 },
    { width: 360, height: 800 },
  ].entries()) {
    await page.setViewportSize(viewport)
    await page.goto(ticketUrl)
    await assertA11y(page)
    await assertNoHorizontalOverflow(page)

    const fileInput = page.getByLabel('Completion photos')
    await fileInput.focus()
    await assertVisibleFocusWithin(
      page,
      'input[aria-label="Completion photos"]',
      '.evidence-file-picker',
    )
    if (index === 0) {
      await fileInput.setInputFiles({
        name: 'a11y-repair-proof.png',
        mimeType: 'image/png',
        buffer: VALID_PNG,
      })
    } else {
      await expect(page.getByText('1 active photo')).toBeVisible()
    }

    const remove = page.getByRole('button', {
      name: 'Remove evidence photo 1',
    })
    await expect(remove).toBeVisible()
    await remove.focus()
    await assertVisibleFocus(page, 'button:has-text("Remove evidence photo 1")')

    const submit = page.getByRole('button', { name: 'Submit completion' })
    await submit.focus()
    await assertVisibleFocus(page, 'button:has-text("Submit completion")')
    await submit.press('Enter')
    const completion = page.getByRole('dialog')
    await assertA11y(page)
    await assertNoHorizontalOverflow(page)
    await expect(completion.getByLabel('Completion summary')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(submit).toBeFocused()
  }

  const completion = page.getByRole('dialog')
  await page.getByRole('button', { name: 'Submit completion' }).press('Enter')
  await completion
    .getByLabel('Completion summary')
    .fill('Repaired the lift guide and tested operation.')
  await completion
    .getByRole('button', { name: 'Confirm submission' })
    .press('Enter')
  await expect(
    page.getByText('awaiting verification', { exact: true }),
  ).toBeVisible()

  await page.setViewportSize({ width: 1440, height: 900 })
  await signOut(page)
  await login(page, admin.email, admin.password)
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 360, height: 800 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto(ticketUrl)
    await assertA11y(page)
    await assertNoHorizontalOverflow(page)
    const view = page.getByRole('button', {
      name: 'View evidence photo 1 from submission attempt 1',
    })
    await expect(view).toBeVisible()
    await view.focus()
    await assertVisibleFocus(page, 'button:has-text("View evidence photo 1")')
    await view.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await assertA11y(page)
    await assertNoHorizontalOverflow(page)
    await expect(
      page.getByRole('img', {
        name: 'Evidence photo 1 from submission attempt 1',
      }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(view).toBeVisible()
  }

  await page.getByRole('button', { name: 'Verify work' }).press('Enter')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm' })
    .press('Enter')
  await expect(page.getByText('completed', { exact: true })).toBeVisible()

  await page.goto(`/assets/${createdAsset.asset.id}`)
  await expect(page.getByTestId('identity-plate')).toBeVisible()
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
