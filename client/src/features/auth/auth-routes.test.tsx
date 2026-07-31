import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../../app/query-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
} from 'react-router-dom'
import { api, ApiError } from '../../app/api'
import { routes } from '../../app/router'
import { safeReturnTo } from '../../app/return-to'
import { LoginPage } from './LoginPage'
import { SetupPage } from './SetupPage'
import { AppShell } from '../../components/AppShell'

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

  it('marks auth unauthenticated on 401 without refetching auth state', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 401 }))

    await expect(api('/api/assets')).rejects.toBeInstanceOf(ApiError)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(['current-user'])).toEqual({
      user: undefined,
    })
  })
})

describe('auth routes', () => {
  beforeEach(() => {
    cleanup()
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

  it('preserves path, query, and hash in safe return targets', () => {
    expect(safeReturnTo('/scan/token?from=qr#plate')).toBe(
      '/scan/token?from=qr#plate',
    )
    expect(safeReturnTo('https://evil.example/steal')).toBeNull()
    expect(safeReturnTo('//evil.example/steal')).toBeNull()
    expect(safeReturnTo('/\\\\evil.example/steal')).toBeNull()
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
    await screen.findByRole('heading', { name: 'Replace temporary access.' })
    expect(screen.getAllByRole('main')).toHaveLength(1)
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

  it('shows an admin placeholder for authorized admin navigation', async () => {
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
    const router = createMemoryRouter(routes, {
      initialEntries: ['/admin/users'],
    })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    expect(
      await screen.findByRole('heading', { name: 'User management' }),
    ).toBeVisible()
    expect(screen.queryByRole('heading', { name: /access denied/i })).toBeNull()
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

  it('maps login field errors and focuses first invalid field', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid credentials.',
            fieldErrors: {
              email: ['Email is not registered.'],
              password: ['Password is incorrect.'],
            },
          },
        }),
        { status: 401 },
      ),
    )
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('Email'), 'person@example.com')
    await user.type(screen.getAllByLabelText('Password').at(-1)!, 'password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Email is not registered.')).toBeVisible()
    expect(screen.getByLabelText('Email')).toHaveFocus()
  })

  it('gates setup until bootstrap status confirms uninitialized', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SetupPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Checking setup status...')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Create society' })).toBeNull()
  })

  it('shows setup failure and blocks submission', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network down'))
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SetupPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(
      await screen.findByText('Unable to check setup status.'),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Create society' })).toBeNull()
  })

  it.each([
    ['resident', false],
    ['technician', false],
    ['admin', true],
  ] as const)(
    'shows role-derived links for %s',
    async (role, hasAdminLinks) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            user: { id: '1', role, mustChangePassword: false, name: role },
          }),
          { status: 200 },
        ),
      )
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AppShell />
          </MemoryRouter>
        </QueryClientProvider>,
      )
      const skipLink = screen.getByRole('link', {
        name: 'Skip to main content',
      })
      expect(skipLink).toHaveAttribute('href', '#main-content')
      expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
      expect(
        await screen.findAllByRole('link', { name: 'Asset ledger' }),
      ).not.toHaveLength(0)
      if (hasAdminLinks)
        expect(
          await screen.findAllByRole('link', { name: 'Users' }),
        ).not.toHaveLength(0)
      else expect(screen.queryByRole('link', { name: 'Users' })).toBeNull()
      if (hasAdminLinks) {
        expect(
          await screen.findAllByRole('link', { name: 'Units' }),
        ).not.toHaveLength(0)
        expect(
          await screen.findAllByRole('link', { name: 'Society settings' }),
        ).not.toHaveLength(0)
      } else {
        expect(screen.queryByRole('link', { name: 'Units' })).toBeNull()
        expect(
          screen.queryByRole('link', { name: 'Society settings' }),
        ).toBeNull()
      }
      expect(
        screen.getAllByRole('button', { name: 'Sign out' }),
      ).not.toHaveLength(0)
    },
  )

  it('renders protected placeholders with route parameters', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: '1',
            role: 'technician',
            mustChangePassword: false,
            name: 'Tech',
          },
        }),
        { status: 200 },
      ),
    )
    const router = createMemoryRouter(routes, {
      initialEntries: ['/scan/qr-123'],
    })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    expect(
      await screen.findByRole('heading', { name: 'Scan asset' }),
    ).toBeVisible()
    expect(screen.getByText('qr-123')).toBeVisible()
  })

  it('denies technician access to admin routes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: '1',
            role: 'technician',
            mustChangePassword: false,
            name: 'Tech',
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
})
