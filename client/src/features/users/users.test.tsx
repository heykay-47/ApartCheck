import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '../../app/query-client'
import { ApiError } from '../../app/api'
import { UserForm } from './UserForm'
import { UsersPage } from './UsersPage'
import { TemporaryPasswordDialog } from './TemporaryPasswordDialog'

function renderWithClient(element: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('user management interfaces', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
  })
  afterEach(cleanup)

  it('shows unit assignment only for residents and excludes inactive units', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          units: [
            {
              id: 'u1',
              building: 'Tower A',
              floor: 'G',
              unitNumber: 'A1',
              archivedAt: null,
            },
            {
              id: 'u2',
              building: 'Tower A',
              floor: 'G',
              unitNumber: 'A2',
              archivedAt: '2026-01-01',
            },
          ],
          pagination: { page: 1, pageSize: 100, total: 2, pages: 1 },
        }),
        { status: 200 },
      ),
    )

    renderWithClient(<UserForm />)
    expect(screen.queryByLabelText('Unit')).toBeNull()
    await userEvent
      .setup()
      .selectOptions(screen.getByLabelText('Role'), 'resident')

    expect(await screen.findByLabelText('Unit')).toBeVisible()
    expect(screen.getByRole('option', { name: /A1/ })).toBeEnabled()
    expect(screen.getByRole('option', { name: /A2/ })).toBeDisabled()
  })

  it('creates account and clears one-time password after acknowledgement', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      if (init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            user: {
              id: 'u1',
              name: 'Mira',
              email: 'mira@example.com',
              phone: '+919876543210',
              role: 'admin',
              active: true,
            },
            temporaryPassword: 'Temp-pass-123456',
          }),
          { status: 201 },
        )
      }
      return new Response(
        JSON.stringify({
          users: [],
          pagination: { page: 1, pageSize: 100, total: 0, pages: 0 },
        }),
        { status: 200 },
      )
    })

    renderWithClient(<UsersPage />)
    await user.click(
      await screen.findByRole('button', { name: 'Create account' }),
    )
    await user.type(screen.getByLabelText('Name'), 'Mira')
    await user.type(screen.getByLabelText('Email'), 'mira@example.com')
    await user.type(screen.getByLabelText('Phone'), '+919876543210')
    await user.click(
      screen.getAllByRole('button', { name: 'Create account' })[1]!,
    )

    expect(
      await screen.findByRole('heading', { name: 'Share temporary password' }),
    ).toBeVisible()
    expect(screen.getByDisplayValue('Temp-pass-123456')).toHaveAttribute(
      'readonly',
    )
    await user.click(screen.getByRole('button', { name: 'I have shared it' }))
    expect(screen.queryByDisplayValue('Temp-pass-123456')).toBeNull()
    expect(JSON.stringify(queryClient.getQueryCache().getAll())).not.toContain(
      'Temp-pass-123456',
    )
  })

  it('contains modal focus, closes on Escape, and restores trigger focus', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          users: [],
          pagination: { page: 1, pageSize: 25, total: 0, pages: 0 },
        }),
        { status: 200 },
      ),
    )

    renderWithClient(<UsersPage />)
    const trigger = await screen.findByRole('button', {
      name: 'Create account',
    })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Create account' })
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(dialog).toHaveAttribute('open')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Create account' })).toBeNull()
    expect(trigger).toHaveFocus()
  })

  it('clears a temporary password when its dialog closes with Escape', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      if (init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            user: {
              id: 'u1',
              name: 'Mira',
              email: 'mira@example.com',
              phone: '+919876543210',
              role: 'admin',
              active: true,
            },
            temporaryPassword: 'Temp-pass-123456',
          }),
          { status: 201 },
        )
      }
      return new Response(
        JSON.stringify({
          users: [],
          pagination: { page: 1, pageSize: 100, total: 0, pages: 0 },
        }),
        { status: 200 },
      )
    })

    renderWithClient(<UsersPage />)
    await user.click(
      await screen.findByRole('button', { name: 'Create account' }),
    )
    await user.type(screen.getByLabelText('Name'), 'Mira')
    await user.type(screen.getByLabelText('Email'), 'mira@example.com')
    await user.type(screen.getByLabelText('Phone'), '+919876543210')
    await user.click(
      screen.getAllByRole('button', { name: 'Create account' })[1]!,
    )
    expect(await screen.findByDisplayValue('Temp-pass-123456')).toBeVisible()

    await user.keyboard('{Escape}')

    expect(screen.queryByDisplayValue('Temp-pass-123456')).toBeNull()
    expect(JSON.stringify(queryClient.getQueryCache().getAll())).not.toContain(
      'Temp-pass-123456',
    )
    expect(
      JSON.stringify(queryClient.getMutationCache().getAll()),
    ).not.toContain('Temp-pass-123456')
  })

  it('copies only current password', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    render(
      <TemporaryPasswordDialog
        credential={{
          user: {
            id: 'u1',
            name: 'Mira',
            email: 'mira@example.com',
            phone: '+919876543210',
            role: 'admin',
            active: true,
          },
          temporaryPassword: 'one-time-secret',
        }}
        onClose={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Copy password' }))

    expect(writeText).toHaveBeenCalledWith('one-time-secret')
    expect(writeText).toHaveBeenCalledTimes(1)
  })

  it('keeps last-admin server errors visible', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new ApiError(409, 'LAST_ACTIVE_ADMIN', 'Keep one active administrator.'),
    )

    renderWithClient(<UserForm />)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(
      await screen.findByText('Keep one active administrator.'),
    ).toBeVisible()
  })

  it('uses textual account status and reset action label', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          users: [
            {
              id: 'u1',
              name: 'Mira',
              email: 'mira@example.com',
              phone: '+919876543210',
              role: 'admin',
              active: true,
            },
          ],
          pagination: { page: 1, pageSize: 25, total: 1, pages: 1 },
        }),
        { status: 200 },
      ),
    )

    renderWithClient(<UsersPage />)
    expect(
      await screen.findByRole('button', {
        name: 'Issue new temporary password for Mira',
      }),
    ).toBeVisible()
  })

  it('disables password reset while request is pending', async () => {
    const user = userEvent.setup()
    let resolveReset!: (response: Response) => void
    const resetResponse = new Promise<Response>((resolve) => {
      resolveReset = resolve
    })
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        if (init?.method === 'POST') return resetResponse
        return new Response(
          JSON.stringify({
            users: [
              {
                id: 'u1',
                name: 'Mira',
                email: 'mira@example.com',
                phone: '+919876543210',
                role: 'admin',
                active: true,
              },
            ],
            pagination: { page: 1, pageSize: 25, total: 1, pages: 1 },
          }),
          { status: 200 },
        )
      })

    renderWithClient(<UsersPage />)
    const reset = await screen.findByRole('button', {
      name: 'Issue new temporary password for Mira',
    })
    await user.click(reset)
    expect(reset).toBeDisabled()
    await user.click(reset)
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    resolveReset(
      new Response(
        JSON.stringify({
          user: {
            id: 'u1',
            name: 'Mira',
            email: 'mira@example.com',
            phone: '+919876543210',
            role: 'admin',
            active: true,
          },
          temporaryPassword: 'Temp-pass-123456',
        }),
        { status: 200 },
      ),
    )
  })

  it('retains last-admin status errors and blocks that row action', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      if (init?.method === 'PATCH') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'LAST_ACTIVE_ADMIN',
              message: 'Keep one active administrator.',
            },
          }),
          { status: 409 },
        )
      }
      return new Response(
        JSON.stringify({
          users: [
            {
              id: 'u1',
              name: 'Mira',
              email: 'mira@example.com',
              phone: '+919876543210',
              role: 'admin',
              active: true,
            },
          ],
          pagination: { page: 1, pageSize: 25, total: 1, pages: 1 },
        }),
        { status: 200 },
      )
    })

    renderWithClient(<UsersPage />)
    const disable = await screen.findByRole('button', {
      name: 'Disable account',
    })
    await user.click(disable)

    expect(
      (await screen.findAllByText('Keep one active administrator.')).length,
    ).toBe(2)
    expect(disable).toBeDisabled()
  })
})
