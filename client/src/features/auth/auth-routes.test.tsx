import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../../app/query-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { api, ApiError } from '../../app/api'
import { routes } from '../../app/router'

describe('api wrapper', () => {
  it('sends JSON credentials and parses success responses', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      )

    await expect(api<{ ok: boolean }>('/api/test')).resolves.toEqual({
      ok: true,
    })
    const [, options] = fetchMock.mock.calls[0] ?? []
    expect(options).toMatchObject({ credentials: 'include' })
    expect((options?.headers as Headers).get('Content-Type')).toBe(
      'application/json',
    )
    fetchMock.mockRestore()
  })

  it('exposes structured API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'BAD_INPUT',
            message: 'Nope',
            fieldErrors: { email: ['Invalid'] },
            requestId: 'req-1',
          },
        }),
        { status: 422 },
      ),
    )
    await expect(api('/api/test')).rejects.toMatchObject(
      new ApiError(422, 'BAD_INPUT', 'Nope', { email: ['Invalid'] }, 'req-1'),
    )
    vi.restoreAllMocks()
  })
})

describe('auth routes', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
  })
  it('redirects unauthenticated protected routes to login', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 401 }),
    )
    const router = createMemoryRouter(routes, { initialEntries: ['/assets'] })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toBe('?returnTo=%2Fassets')
  })

  it('redirects password-change users to change password', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: '1',
            role: 'resident',
            mustChangePassword: true,
            name: 'Resident',
          },
        }),
        { status: 200 },
      ),
    )
    const router = createMemoryRouter(routes, {
      initialEntries: ['/dashboard'],
    })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/change-password'),
    )
  })

  it('shows access denied for resident admin navigation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: '1',
            role: 'resident',
            mustChangePassword: false,
            name: 'Resident',
          },
        }),
        { status: 200 },
      ),
    )
    const router = createMemoryRouter(routes, {
      initialEntries: ['/admin/users'],
    })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    expect(
      await screen.findByRole('heading', { name: /access denied/i }),
    ).toBeVisible()
  })

  it('redirects authenticated login page to dashboard', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: '1',
            role: 'admin',
            mustChangePassword: false,
            name: 'Admin',
          },
        }),
        { status: 200 },
      ),
    )
    const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/dashboard'),
    )
  })
})
