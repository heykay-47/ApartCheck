import { cleanup, render, screen } from '@testing-library/react'
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
      screen.getAllByRole('link', { name: 'Explore the product' })[0],
    ).toHaveAttribute('href', '#product-tour')
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute(
      'href',
      '/login',
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
