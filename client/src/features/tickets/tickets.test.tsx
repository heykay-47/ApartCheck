import { QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'node:fs'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  advanceSession,
  getSessionGeneration,
  sessionRequest,
} from '../../app/api'
import { queryClient } from '../../app/query-client'
import { TicketForm } from './TicketForm'
import { TicketDetailPage } from './TicketDetailPage'
import { TicketsPage } from './TicketsPage'
import { formatTicketDate } from './ticket-format'
import type { Ticket } from './ticket-api'

const globalCss = readFileSync('src/styles/global.css', 'utf8')
const tokensCss = readFileSync('src/styles/tokens.css', 'utf8')

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
const administrator = {
  id: 'a1',
  name: 'Administrator One',
  email: 'admin@test',
  role: 'admin',
  mustChangePassword: false,
}
const technician = {
  id: 't1',
  name: 'Technician One',
  email: 'technician@test',
  role: 'technician',
  mustChangePassword: false,
}
const unit = {
  id: 'u1',
  building: 'Tower A',
  floor: '4',
  unitNumber: '401',
}
const asset = {
  id: 'a1',
  assetCode: 'LFT-0007',
  name: 'Passenger lift',
  category: 'lift',
  locationDescription: 'Tower A lobby',
  installDate: null,
  archivedAt: null,
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

const detailTicket: Ticket = {
  id: 't1',
  title: 'Lift vibration',
  description:
    'The passenger lift vibrates during travel and needs a guide inspection.',
  status: 'in_progress',
  unit: {
    id: 'u1',
    building: 'Tower A',
    floor: '4',
    unitNumber: '401',
    active: true,
  },
  asset: {
    id: 'asset1',
    assetCode: 'LFT-0007',
    name: 'Passenger lift',
    active: true,
  },
  reporter: { id: 'r1', name: 'Resident One' },
  assignee: {
    id: technician.id,
    name: technician.name,
    active: true,
    role: 'technician',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T12:30:00.000Z',
  events: [
    {
      id: 'event1',
      type: 'created',
      fromStatus: null,
      toStatus: 'open',
      actor: { id: 'r1', name: 'Resident One' },
      assignee: null,
      note: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
}

function renderTicketDetail(item: Ticket) {
  renderWithClient(
    <Routes>
      <Route path="/tickets/:id" element={<TicketDetailPage />} />
    </Routes>,
    [`/tickets/${item.id}`],
  )
}

function mockTicketDetail(
  actor: typeof administrator | typeof technician,
  item: Ticket,
  action?: (url: string, init?: RequestInit) => Promise<Response> | undefined,
) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input)
    if (url.endsWith('/api/auth/me'))
      return Promise.resolve(new Response(JSON.stringify({ user: actor })))
    if (url === `/api/tickets/${item.id}`)
      return Promise.resolve(new Response(JSON.stringify({ ticket: item })))
    return action?.(url, init) ?? Promise.resolve(new Response('{}'))
  })
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

  it.each([
    ['/tickets?search=lift&page=1&status=bogus', '?search=lift'],
    ['/tickets?search=lift&page=abc', '?search=lift'],
    ['/tickets?search=lift&page=0', '?search=lift'],
  ])('normalizes invalid ledger URL state from %s', async (entry, expected) => {
    mockResidentTicketLedger()
    renderWithClient(
      <>
        <TicketsPage />
        <LocationProbe />
      </>,
      [entry],
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Current location').textContent).toBe(
        expected,
      ),
    )
    expect(screen.getByLabelText('Search tickets')).toHaveValue('lift')
    expect(screen.getByLabelText('Ticket status filter')).toHaveValue('')
  })

  it('keeps narrow-screen pagination targets at least 44px square', () => {
    const rule = globalCss.match(
      /@media\s*\(max-width:\s*700px\)[\s\S]*?\.tickets-page\s+\.pagination\s+\.text-button\s*\{([^}]*)\}/,
    )?.[1]

    expect(rule).toMatch(/min-width:\s*44px/)
    expect(rule).toMatch(/min-height:\s*44px/)
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

  it('formats Ticket records consistently and lets Modal focus completion evidence', async () => {
    mockTicketDetail(technician, detailTicket)
    const actor = userEvent.setup()
    renderTicketDetail(detailTicket)

    expect(
      await screen.findAllByText(formatTicketDate(detailTicket.createdAt)),
    ).not.toHaveLength(0)
    expect(
      screen.getByRole('button', { name: 'Submit completion' }),
    ).toBeVisible()

    await actor.click(screen.getByRole('button', { name: 'Submit completion' }))
    const summary = screen.getByLabelText('Completion summary')
    expect(summary).toHaveFocus()
    expect(summary).not.toHaveAttribute('autofocus')
  })

  it('announces a pending completion submission on its disabled action', async () => {
    mockTicketDetail(technician, detailTicket, (url) => {
      if (url === '/api/tickets/t1/submit') return new Promise(() => undefined)
    })
    const actor = userEvent.setup()
    renderTicketDetail(detailTicket)

    await actor.click(
      await screen.findByRole('button', { name: 'Submit completion' }),
    )
    await actor.type(
      screen.getByLabelText('Completion summary'),
      'Replaced the worn lift guide.',
    )
    await actor.click(screen.getByRole('button', { name: 'Confirm' }))

    const saving = await screen.findByRole('button', { name: 'Saving…' })
    expect(saving).toBeDisabled()
    expect(saving).toHaveAttribute('aria-busy', 'true')
  })

  it('exposes only Administrator verification actions as one named group', async () => {
    const awaitingVerification: Ticket = {
      ...detailTicket,
      status: 'awaiting_verification',
    }
    mockTicketDetail(administrator, awaitingVerification, (url) => {
      if (url === '/api/tickets/t1/verify') return new Promise(() => undefined)
    })
    const actor = userEvent.setup()
    renderTicketDetail(awaitingVerification)

    expect(
      await screen.findByRole('group', { name: 'Ticket actions' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Verify work' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Return for rework' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Submit completion' }),
    ).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start work' })).toBeNull()

    await actor.click(screen.getByRole('button', { name: 'Verify work' }))
    await actor.click(screen.getByRole('button', { name: 'Confirm' }))
    const saving = await screen.findByRole('button', { name: 'Saving…' })
    expect(saving).toBeDisabled()
    expect(saving).toHaveAttribute('aria-busy', 'true')
  })

  it('identifies technician search and exposes assignment progress', async () => {
    mockTicketDetail(administrator, detailTicket, (url) => {
      if (url.startsWith('/api/tickets/eligible-technicians?'))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              technicians: [
                {
                  id: 't2',
                  name: 'R. Shah',
                  email: 'technician@example.com',
                },
              ],
              pagination: { page: 1, pageSize: 25, total: 1, pages: 1 },
            }),
          ),
        )
      if (url === '/api/tickets/t1/assignment')
        return new Promise(() => undefined)
    })
    const actor = userEvent.setup()
    renderTicketDetail(detailTicket)

    await actor.click(
      await screen.findByRole('button', { name: 'Reassign technician' }),
    )
    const search = screen.getByLabelText('Search active technicians')
    expect(search).toHaveAttribute('name', 'technicianSearch')
    expect(search).toHaveAttribute('autocomplete', 'off')
    expect(search).toHaveAttribute(
      'placeholder',
      'Example: R. Shah or technician@example.com…',
    )

    await actor.selectOptions(await screen.findByLabelText('Technician'), 't2')
    await actor.click(screen.getByRole('button', { name: 'Save assignment' }))
    const saving = await screen.findByRole('button', {
      name: 'Saving assignment…',
    })
    expect(saving).toBeDisabled()
    expect(saving).toHaveAttribute('aria-busy', 'true')
  })

  it('hardens long Ticket records and narrow-screen action targets', () => {
    expect(tokensCss).toMatch(/--color-error:\s*#a32626/)
    expect(globalCss).toMatch(
      /\.ticket-detail-page \.lede,[\s\S]*?\.ticket-detail-page \.eyebrow\s*\{[^}]*overflow-wrap:\s*anywhere[^}]*\}/,
    )
    expect(globalCss).toMatch(
      /\.ticket-actions\s*\{[^}]*padding:\s*18px 0[^}]*border-top:\s*2px solid var\(--color-slate\)[^}]*border-bottom:\s*1px solid rgb\(32 52 59 \/ 0\.35\)[^}]*\}/,
    )
    expect(globalCss).toMatch(
      /\.ticket-event time,\s*\.ticket-definition time\s*\{[^}]*font-variant-numeric:\s*tabular-nums[^}]*\}/,
    )
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*700px\)[\s\S]*?\.ticket-actions\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*1fr[^}]*\}[\s\S]*?\.ticket-actions > \*\s*\{[^}]*width:\s*100%[^}]*min-height:\s*44px[^}]*\}[\s\S]*?\.ticket-detail-page \.dialog-actions > \*\s*\{[^}]*min-height:\s*44px[^}]*\}/,
    )
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

  it('deduplicates selected report options and exposes stable form metadata', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/api/auth/me'))
        return new Response(JSON.stringify({ user: administrator }))
      if (url === '/api/units/u1') return new Response(JSON.stringify({ unit }))
      if (url.startsWith('/api/units?'))
        return new Response(
          JSON.stringify({
            units: [unit],
            pagination: { page: 1, pageSize: 25, total: 1, pages: 1 },
          }),
        )
      if (url === '/api/assets/a1')
        return new Response(JSON.stringify({ asset }))
      if (url.startsWith('/api/assets?'))
        return new Response(
          JSON.stringify({
            assets: [asset],
            pagination: { page: 1, pageSize: 25, total: 1, pages: 1 },
          }),
        )
      return new Response('{}')
    })
    const actor = userEvent.setup()
    renderWithClient(<TicketForm />, ['/tickets/new?assetId=a1'])

    const unitSelect = await screen.findByLabelText('Unit')
    await waitFor(() =>
      expect(unitSelect.querySelector('option[value="u1"]')).not.toBeNull(),
    )
    await actor.selectOptions(unitSelect, 'u1')
    const assetSelect = screen.getByLabelText('Asset (optional)')
    await waitFor(() =>
      expect(unitSelect.querySelectorAll('option[value="u1"]')).toHaveLength(1),
    )
    expect(assetSelect.querySelectorAll('option[value="a1"]')).toHaveLength(1)

    expect(screen.getByLabelText('Find a unit')).toHaveAttribute(
      'name',
      'unitSearch',
    )
    expect(screen.getByLabelText('Find a unit')).toHaveAttribute(
      'autocomplete',
      'off',
    )
    expect(screen.getByLabelText('Find a unit')).toHaveAttribute(
      'placeholder',
      'Example: Tower A or 401…',
    )
    expect(unitSelect).toHaveAttribute('name', 'unitId')
    expect(unitSelect).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByLabelText('Find an asset (optional)')).toHaveAttribute(
      'name',
      'assetSearch',
    )
    expect(screen.getByLabelText('Find an asset (optional)')).toHaveAttribute(
      'autocomplete',
      'off',
    )
    expect(screen.getByLabelText('Find an asset (optional)')).toHaveAttribute(
      'placeholder',
      'Example: LFT-0007 or passenger lift…',
    )
    expect(assetSelect).toHaveAttribute('name', 'assetId')
    expect(assetSelect).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByLabelText('Title')).toHaveAttribute('name', 'title')
    expect(screen.getByLabelText('Title')).toHaveAttribute(
      'autocomplete',
      'off',
    )
    expect(screen.getByLabelText('Title')).toHaveAttribute(
      'placeholder',
      'Example: Lift guide is worn…',
    )
    expect(screen.getByLabelText('Description')).toHaveAttribute(
      'name',
      'description',
    )
    expect(screen.getByLabelText('Description')).toHaveAttribute(
      'autocomplete',
      'off',
    )
    expect(screen.getByLabelText('Description')).toHaveAttribute(
      'placeholder',
      'Describe what is happening, where it occurs, and what needs attention…',
    )
  })

  it('exposes unavailable Unit and Asset lookup states', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/api/auth/me'))
        return new Response(JSON.stringify({ user: administrator }))
      if (url.startsWith('/api/units?') || url.startsWith('/api/assets?')) {
        return new Response(
          JSON.stringify({
            error: { code: 'LOOKUP_UNAVAILABLE', message: 'Unavailable.' },
          }),
          { status: 503 },
        )
      }
      return new Response('{}')
    })

    renderWithClient(<TicketForm />, ['/tickets/new'])

    expect(
      await screen.findByText('Units are unavailable. Try again.'),
    ).toBeVisible()
    expect(
      await screen.findByText('Assets are unavailable. Try again.'),
    ).toBeVisible()
  })

  it('explains an unavailable Resident Unit and keeps reporting disabled', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/api/auth/me'))
        return new Response(JSON.stringify({ user }))
      if (url.endsWith('/api/units/me')) {
        return new Response(
          JSON.stringify({
            error: { code: 'UNIT_UNAVAILABLE', message: 'Unavailable.' },
          }),
          { status: 503 },
        )
      }
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

    expect(
      await screen.findByText(
        'Your Unit is unavailable. Ask the Society Administrator to confirm your current Unit.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Report ticket' })).toBeDisabled()
  })

  it('styles resilient Ticket report states and narrow-screen actions', () => {
    expect(globalCss).toMatch(
      /\.lookup-state\s*\{[^}]*margin:\s*-12px 0 18px[^}]*max-width:\s*70ch[^}]*\}/,
    )
    expect(globalCss).toMatch(
      /\.ticket-form input,\s*\.ticket-form textarea,\s*\.ticket-form select\s*\{[^}]*overflow-wrap:\s*anywhere[^}]*\}/,
    )
    expect(globalCss).toMatch(
      /@media\s*\(max-width:\s*700px\)[\s\S]*?\.ticket-form \.dialog-actions\s*\{[^}]*display:\s*grid[^}]*\}[\s\S]*?\.ticket-form \.dialog-actions > \*\s*\{[^}]*width:\s*100%[^}]*min-height:\s*44px[^}]*\}/,
    )
  })
})
