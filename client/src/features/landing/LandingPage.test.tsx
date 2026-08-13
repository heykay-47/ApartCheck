import { cleanup, render, screen, within } from '@testing-library/react'
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

  it('presents the product mechanism and portfolio actions', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Put a record where the work begins.',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Skip to landing content' }),
    ).toHaveAttribute('href', '#landing-content')

    const source = screen.getAllByRole('link', {
      name: /inspect source/i,
    })[0]
    expect(source).toHaveAttribute(
      'href',
      'https://github.com/heykay-47/ApartCheck',
    )
    expect(source).toHaveAttribute('target', '_blank')
    expect(source).toHaveAttribute('rel', 'noreferrer')
    expect(
      screen.getAllByRole('link', { name: /open the work record/i })[0],
    ).toHaveAttribute('href', '/login')

    const stages = within(
      screen.getByLabelText('Asset trace stages'),
    ).getAllByRole('listitem')
    expect(stages.map((stage) => stage.textContent)).toEqual([
      expect.stringContaining('Register'),
      expect.stringContaining('Label'),
      expect.stringContaining('Scan'),
      expect.stringContaining('Retrieve'),
    ])
    expect(screen.getByText('SHIPPED NOW')).toBeVisible()
    expect(screen.getByText('Tickets')).toBeVisible()
    expect(screen.getByText('Technician assignment')).toBeVisible()
    expect(screen.getByText('Textual completion proof')).toBeVisible()
    expect(screen.getByText('Administrator verification')).toBeVisible()
    expect(screen.getByText('Immutable history')).toBeVisible()
    expect(
      screen.queryByText('IMPLEMENTED LOCALLY — NOT LIVE'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('DIRECTION, NOT CLAIM')).toBeVisible()
    expect(screen.getByText(/demo credentials are private/i)).toBeVisible()
    expect(screen.getByText('Asset & Ticket accountability')).toBeVisible()
  })

  it('uses the exact action labels for every repeated call to action', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    const sourceActions = screen.getAllByRole('link', {
      name: 'Inspect source',
    })
    expect(sourceActions).toHaveLength(3)
    sourceActions.forEach((action) =>
      expect(action).toHaveAttribute(
        'href',
        'https://github.com/heykay-47/ApartCheck',
      ),
    )

    const workRecordActions = screen.getAllByRole('link', {
      name: 'Open the work record',
    })
    expect(workRecordActions).toHaveLength(2)
    workRecordActions.forEach((action) =>
      expect(action).toHaveAttribute('href', '/login'),
    )
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
        name: 'Put a record where the work begins.',
      }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/')
  })
})
