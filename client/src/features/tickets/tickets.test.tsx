import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  advanceSession,
  getSessionGeneration,
  sessionRequest,
} from '../../app/api'
import { queryClient } from '../../app/query-client'
import { TicketForm } from './TicketForm'
import { TicketsPage } from './TicketsPage'

function renderWithClient(
  element: React.ReactNode,
  initialEntries = ['/tickets'],
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{element}</MemoryRouter>
    </QueryClientProvider>,
  )
}

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="Current location">{location.search}</output>
}

const user = {
  id: 'r1',
  name: 'Resident One',
  email: 'resident@test',
  role: 'resident',
  mustChangePassword: false,
}
const ticket = {
  id: 't1',
  title: 'Lift vibration',
  status: 'open',
  unit: {
    id: 'u1',
    building: 'A',
    floor: '4',
    unitNumber: '401',
    active: true,
  },
  asset: null,
  reporter: { id: 'r1', name: 'Resident One' },
  assignee: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockResidentTicketLedger() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.endsWith('/api/auth/me'))
      return new Response(JSON.stringify({ user }))
    if (url.startsWith('/api/tickets?'))
      return new Response(
        JSON.stringify({
          tickets: [ticket],
          pagination: { page: 2, pageSize: 25, total: 1, pages: 2 },
        }),
      )
    return new Response('{}')
  })
}

describe('Ticket client workflow', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
  })
  afterEach(cleanup)

  it('sends search and status filters and exposes reporting to Residents', async () => {
    const fetchMock = mockResidentTicketLedger()
    const actor = userEvent.setup()
    renderWithClient(<TicketsPage />)
    expect(await screen.findByText('Lift vibration')).toBeVisible()
    await actor.type(screen.getByLabelText('Search tickets'), 'vibration')
    await actor.selectOptions(
      screen.getByLabelText('Ticket status filter'),
      'open',
    )
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input]) =>
            String(input).includes('search=vibration') &&
            String(input).includes('status=open'),
        ),
      ).toBe(true),
    )
    expect(screen.getByRole('link', { name: 'Report ticket' })).toHaveAttribute(
      'href',
      '/tickets/new',
    )
    expect(screen.getAllByText('open').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('link', { name: 'Open Ticket: Lift vibration' }),
    ).toHaveAttribute('href', '/tickets/t1')
    expect(await screen.findByText('1 ticket on record')).toBeVisible()
    expect(
      screen.getByText(
        new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(ticket.updatedAt)),
      ),
    ).toBeVisible()
  })

  it('restores ledger filters from the URL and writes changes back', async () => {
    mockResidentTicketLedger()
    const actor = userEvent.setup()
    renderWithClient(
      <>
        <TicketsPage />
        <LocationProbe />
      </>,
      ['/tickets?search=lift&status=assigned&page=2'],
    )

    expect(await screen.findByLabelText('Search tickets')).toHaveValue('lift')
    expect(screen.getByLabelText('Ticket status filter')).toHaveValue(
      'assigned',
    )
    expect(screen.getByLabelText('Current location')).toHaveTextContent(
      '?search=lift&status=assigned&page=2',
    )

    await actor.clear(screen.getByLabelText('Search tickets'))
    await actor.type(screen.getByLabelText('Search tickets'), 'pump')
    await waitFor(() =>
      expect(screen.getByLabelText('Current location')).toHaveTextContent(
        '?search=pump&status=assigned',
      ),
    )
  })

  it('rejects a stale protected response after the session boundary advances', async () => {
    let resolve: (response: Response) => void = () => undefined
    const pending = new Promise<Response>((done) => {
      resolve = done
    })
    vi.spyOn(globalThis, 'fetch').mockReturnValue(pending)
    const request = sessionRequest('/api/tickets/t1', {}, (response) =>
      response.json(),
    )
    const generation = getSessionGeneration()
    await advanceSession()
    resolve(
      new Response(
        JSON.stringify({ ticket: { id: 't1', description: 'private' } }),
      ),
    )
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    expect(getSessionGeneration()).toBe(generation + 1)
    expect(queryClient.getQueryData(['ticket', 't1'])).toBeUndefined()
  })

  it('keeps the Resident Unit fixed to the authenticated /units/me response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/api/auth/me'))
        return new Response(JSON.stringify({ user }))
      if (url.startsWith('/api/units?'))
        return new Response(
          JSON.stringify({
            units: [],
            pagination: { page: 1, pageSize: 25, total: 0, pages: 0 },
          }),
        )
      if (url.endsWith('/api/units/me'))
        return new Response(
          JSON.stringify({
            unit: { id: 'u1', building: 'A', floor: '4', unitNumber: '401' },
          }),
        )
      if (url.startsWith('/api/assets?'))
        return new Response(
          JSON.stringify({
            assets: [],
            pagination: { page: 1, pageSize: 25, total: 0, pages: 0 },
          }),
        )
      return new Response('{}')
    })
    renderWithClient(<TicketForm />)
    expect(await screen.findByText('A / 4 / 401')).toBeVisible()
    expect(screen.queryByLabelText('Unit')).toBeNull()
  })

  it('keeps the Resident Unit selected while filling a report', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/api/auth/me'))
        return new Response(JSON.stringify({ user }))
      if (url.endsWith('/api/units/me'))
        return new Response(
          JSON.stringify({
            unit: { id: 'u1', building: 'A', floor: '4', unitNumber: '401' },
          }),
        )
      if (url.startsWith('/api/assets?'))
        return new Response(
          JSON.stringify({
            assets: [],
            pagination: { page: 1, pageSize: 25, total: 0, pages: 0 },
          }),
        )
      return new Response('{}')
    })
    const actor = userEvent.setup()
    renderWithClient(<TicketForm />)

    await screen.findByText('A / 4 / 401')
    await actor.type(screen.getByLabelText('Title'), 'Lift vibration')
    await actor.type(
      screen.getByLabelText('Description'),
      'The lift vibrates during operation and needs inspection.',
    )

    expect(screen.getByRole('button', { name: 'Report ticket' })).toBeEnabled()
  })
})
