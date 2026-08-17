import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
} from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { queryClient } from '../../app/query-client'
import { routes } from '../../app/router'
import { LandingPage } from './LandingPage'

describe('landing page', () => {
  beforeEach(() => cleanup())

  it('presents ApartCheck as a customer-first maintenance product', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Every repair. One accountable record.',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Skip to landing content' }),
    ).toHaveAttribute('href', '#landing-content')

    expect(
      screen.getAllByRole('link', { name: 'Explore the product' })[0],
    ).toHaveAttribute('href', '#product-tour')
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute(
      'href',
      '/login',
    )
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveClass(
      'landing-secondary-action',
    )
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).not.toHaveClass(
      'landing-primary-action',
    )
    expect(screen.getByRole('link', { name: 'GitHub source' })).toHaveClass(
      'landing-footer-link',
    )
    expect(screen.getByText('Three enforced Member roles')).toBeVisible()
    expect(screen.getByText('Society-scoped records')).toBeVisible()
    expect(screen.getByText('Deployed Ticket workflow')).toBeVisible()
    expect(screen.getByText('Automated delivery gates')).toBeVisible()
  })

  it('does not advertise unavailable commercial capabilities', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole('link', { name: /sign up|start.*trial/i }),
    ).toBeNull()
    expect(screen.queryByText(/customer testimonial|trusted by/i)).toBeNull()
    expect(screen.getByText(/synthetic product data/i)).toBeVisible()
  })

  it('labels inactive preview history without reducing its text contrast', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    const reportPreview = screen
      .getAllByRole('article', { name: 'Synthetic Ticket preview' })
      .find((preview) => preview.getAttribute('data-step') === 'report')

    expect(reportPreview).toBeDefined()
    const inactiveRow = within(reportPreview!)
      .getByText('Assigned')
      .closest('li')
    expect(inactiveRow).toHaveAttribute('data-state', 'pending')
    expect(inactiveRow).toHaveTextContent('Not yet reached')
    expect(inactiveRow).not.toHaveAttribute('style')
  })

  it('moves the product preview through the accessible workflow', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    const workflow = screen.getByRole('region', {
      name: 'From report to verified repair',
    })
    const verify = within(workflow).getByRole('tab', { name: /verify/i })

    expect(
      within(workflow).getByRole('tab', { name: /report/i }),
    ).toHaveAttribute('aria-selected', 'true')
    await user.click(verify)
    expect(verify).toHaveAttribute('aria-selected', 'true')
    expect(
      within(workflow).getByText('Verified', {
        selector: '.preview-title-block p',
      }),
    ).toBeVisible()
    expect(
      within(workflow).getByText('Aarav Mehta · Administrator', {
        selector: 'dd',
      }),
    ).toBeVisible()

    const report = within(workflow).getByRole('tab', { name: /report/i })
    report.focus()
    await user.keyboard('{ArrowRight}')
    expect(within(workflow).getByRole('tab', { name: /assign/i })).toHaveFocus()
    expect(
      within(workflow).getByRole('tab', { name: /assign/i }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('moves vertically through workflow tabs with wrapping', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    const workflow = screen.getByRole('region', {
      name: 'From report to verified repair',
    })
    const tablist = within(workflow).getByRole('tablist')
    const report = within(workflow).getByRole('tab', { name: /report/i })
    const assign = within(workflow).getByRole('tab', { name: /assign/i })
    const verify = within(workflow).getByRole('tab', { name: /verify/i })

    expect(tablist).toHaveAttribute('aria-orientation', 'vertical')
    report.focus()
    await user.keyboard('{ArrowDown}')
    expect(assign).toHaveFocus()
    expect(assign).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowUp}')
    expect(report).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(verify).toHaveFocus()
    expect(verify).toHaveAttribute('aria-selected', 'true')
  })

  it('reveals every target when IntersectionObserver is unavailable', async () => {
    const originalIntersectionObserver = window.IntersectionObserver
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: undefined,
    })

    try {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        const revealTargets = document.querySelectorAll('[data-reveal]')
        expect(revealTargets.length).toBeGreaterThan(0)
        revealTargets.forEach((target) => {
          expect(target).toHaveClass('is-visible')
        })
      })
    } finally {
      Object.defineProperty(window, 'IntersectionObserver', {
        configurable: true,
        value: originalIntersectionObserver,
      })
    }
  })

  it('serves the landing page at the public root', async () => {
    queryClient.clear()
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Every repair. One accountable record.',
      }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/')
  })
})
