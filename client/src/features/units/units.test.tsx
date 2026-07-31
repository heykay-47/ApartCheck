import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '../../app/query-client'
import { ApiError } from '../../app/api'
import { AppShell } from '../../components/AppShell'
import { AdminDashboard } from '../dashboard/AdminDashboard'
import { SocietySettingsPage } from '../society/SocietySettingsPage'
import { UnitForm } from './UnitForm'
import { UnitsPage } from './UnitsPage'

function renderWithClient(element: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('society and unit interfaces', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
  })
  afterEach(cleanup)

  it('turns missing counts into actionable admin setup rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input)
      const payload = path.includes('/units')
        ? {
            units: [],
            pagination: { page: 1, pageSize: 1, total: 0, pages: 0 },
          }
        : path.includes('/users')
          ? {
              users: [],
              pagination: { page: 1, pageSize: 1, total: 0, pages: 0 },
            }
          : {
              assets: [],
              pagination: { page: 1, pageSize: 1, total: 0, pages: 0 },
            }
      return new Response(JSON.stringify(payload), { status: 200 })
    })

    renderWithClient(<AdminDashboard />)

    expect(await screen.findByText('Add first unit')).toBeVisible()
    expect(screen.getByText('Invite first user')).toBeVisible()
    expect(screen.getByText('Register first asset')).toBeVisible()
  })

  it('keeps society and unit management out of resident navigation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: 'resident-1',
            name: 'Resident',
            email: 'resident@example.com',
            role: 'resident',
            mustChangePassword: false,
          },
        }),
        { status: 200 },
      ),
    )

    renderWithClient(<AppShell />)

    await screen.findAllByRole('link', { name: 'Dashboard' })
    expect(screen.queryByRole('link', { name: 'Units' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Society settings' })).toBeNull()
  })

  it('renders updated society settings after save', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            society: { id: 's1', name: 'Old name', address: 'Old address' },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            society: { id: 's1', name: 'New name', address: 'New address' },
          }),
          { status: 200 },
        ),
      )

    renderWithClient(<SocietySettingsPage />)
    expect(await screen.findByDisplayValue('Old name')).toBeVisible()
    await user.clear(screen.getByLabelText('Society name'))
    await user.type(screen.getByLabelText('Society name'), 'New name')
    await user.clear(screen.getByLabelText('Address'))
    await user.type(screen.getByLabelText('Address'), 'New address')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByDisplayValue('New name')).toBeVisible()
    expect(screen.getByDisplayValue('New address')).toBeVisible()
    expect(queryClient.getQueryData(['society'])).toEqual({
      society: { id: 's1', name: 'New name', address: 'New address' },
    })
  })

  it('creates a unit, offers create another, and invalidates units', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ unit: { id: 'u1' } }), { status: 201 }),
      )
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    renderWithClient(<UnitForm />)
    await user.type(screen.getByLabelText('Building'), 'Tower A')
    await user.type(screen.getByLabelText('Floor'), 'G')
    await user.type(screen.getByLabelText('Unit number'), 'A1')
    await user.click(screen.getByRole('button', { name: 'Create unit' }))

    expect(
      await screen.findByText('Unit created. Create another unit?'),
    ).toBeVisible()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['units'] })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/units',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          building: 'Tower A',
          floor: 'G',
          unitNumber: 'A1',
        }),
      }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Create another unit' }),
    )
    expect(screen.getByLabelText('Unit number')).toHaveValue('')
  })

  it('renders server unit-number errors beside input', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new ApiError(422, 'VALIDATION_ERROR', 'Invalid unit.', {
        unitNumber: ['Unit number already exists.'],
      }),
    )

    renderWithClient(<UnitForm />)
    await user.type(screen.getByLabelText('Unit number'), 'A1')
    await user.click(screen.getByRole('button', { name: 'Create unit' }))

    expect(await screen.findByText('Unit number already exists.')).toBeVisible()
  })

  it('archives a unit after confirmation and removes its row', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            units: [
              { id: 'u1', building: 'Tower A', floor: 'G', unitNumber: 'A1' },
            ],
            pagination: { page: 1, pageSize: 25, total: 1, pages: 1 },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    renderWithClient(<UnitsPage />)
    expect(await screen.findByText('A1')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Archive unit A1' }))
    expect(screen.getByText('Archive unit A1?')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Archive unit' }))

    await waitFor(() => expect(screen.queryByText('A1')).toBeNull())
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Unit ledger' }),
      ).toHaveFocus(),
    )
  })

  it('shows recovery guidance when residents block archive', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            units: [
              { id: 'u1', building: 'Tower A', floor: 'G', unitNumber: 'A1' },
            ],
            pagination: { page: 1, pageSize: 25, total: 1, pages: 1 },
          }),
          { status: 200 },
        ),
      )
      .mockRejectedValueOnce(
        new ApiError(
          409,
          'UNIT_HAS_ACTIVE_RESIDENTS',
          'Unit has active residents and cannot be archived.',
        ),
      )

    renderWithClient(<UnitsPage />)
    await screen.findByText('A1')
    await user.click(screen.getByRole('button', { name: 'Archive unit A1' }))
    await user.click(screen.getByRole('button', { name: 'Archive unit' }))

    expect(
      await screen.findByText(
        'Move or deactivate active residents before archiving this unit.',
      ),
    ).toBeVisible()
  })
})
