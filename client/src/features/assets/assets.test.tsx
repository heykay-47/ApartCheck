import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '../../app/query-client'
import { AppShell } from '../../components/AppShell'
import { LoginPage } from '../auth/LoginPage'
import { AssetDetailPage } from './AssetDetailPage'
import { AssetIdentityPlate } from './AssetIdentityPlate'
import { AssetForm } from './AssetForm'
import { AssetsPage } from './AssetsPage'
import { ScanAssetPage } from './ScanAssetPage'

function renderWithClient(element: React.ReactNode, initialEntries = ['/']) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{element}</MemoryRouter>
    </QueryClientProvider>,
  )
}

function LocationProbe() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname + location.search}
    </output>
  )
}

const asset = {
  id: 'a1',
  assetCode: 'LFT-4F2A91',
  name: 'Passenger lift',
  category: 'lift' as const,
  locationDescription: 'Tower A lobby',
  installDate: '2024-04-12T00:00:00.000Z',
  archivedAt: null,
}

describe('asset identity experience', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
  })
  afterEach(cleanup)

  it('uses exact category filters and deferred ledger search', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: 'u1',
            name: 'Resident',
            email: 'r@x.test',
            role: 'resident',
            mustChangePassword: false,
          },
        }),
        { status: 200 },
      ),
    )
    renderWithClient(<AssetsPage />)
    expect(
      await screen.findByText('No assets match current ledger filters.'),
    ).toBeVisible()
    expect(screen.getByRole('option', { name: 'Lift' })).toBeVisible()
    expect(screen.getByRole('option', { name: 'Plumbing' })).toBeVisible()
    expect(screen.getByRole('option', { name: 'Electrical' })).toBeVisible()
    await user.type(screen.getByLabelText('Search assets'), 'lobby')
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('search=lobby'),
        expect.anything(),
      ),
    )
  })

  it('shows mutation controls only to admins', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: {
              id: 'u1',
              name: 'Admin',
              email: 'a@x.test',
              role: 'admin',
              mustChangePassword: false,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [],
            page: 1,
            pageSize: 25,
            total: 0,
            pages: 0,
          }),
          { status: 200 },
        ),
      )
    renderWithClient(<AssetsPage />)
    expect(
      await screen.findByRole('link', { name: 'Create asset' }),
    ).toBeVisible()
    cleanup()
    queryClient.clear()
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: 'u2',
            name: 'Resident',
            email: 'r@x.test',
            role: 'resident',
            mustChangePassword: false,
          },
        }),
        { status: 200 },
      ),
    )
    renderWithClient(<AppShell />)
    expect(
      (await screen.findAllByRole('link', { name: 'Asset ledger' }))[0],
    ).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Admin assets' })).toBeNull()
  })

  it('submits only asset form fields', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ asset }), { status: 201 }),
      )
    renderWithClient(<AssetForm />)
    await user.type(screen.getByLabelText('Asset name'), 'Passenger lift')
    await user.selectOptions(screen.getByLabelText('Category'), 'lift')
    await user.type(screen.getByLabelText('Location'), 'Tower A lobby')
    await user.click(screen.getByRole('button', { name: 'Create asset' }))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/assets',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Passenger lift',
          category: 'lift',
          locationDescription: 'Tower A lobby',
        }),
      }),
    )
  })

  it('renders identity plate fields and QR accessible name', () => {
    renderWithClient(<AssetIdentityPlate asset={asset} qrUrl="blob:qr" />)
    expect(screen.getByText('LFT-4F2A91')).toBeVisible()
    expect(screen.getByText('Passenger lift')).toBeVisible()
    expect(screen.getByText('ASSET IDENTITY / Lift')).toBeVisible()
    expect(screen.getByText('Tower A lobby')).toBeVisible()
    expect(screen.getByText('April 12, 2024')).toBeVisible()
    expect(
      screen.getByRole('img', { name: 'QR code for LFT-4F2A91' }),
    ).toHaveAttribute('src', 'blob:qr')
  })

  it('uses one indistinguishable unavailable state for scan failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('unavailable'))
    renderWithClient(
      <Routes>
        <Route path="/scan/:qrToken" element={<ScanAssetPage />} />
      </Routes>,
      ['/scan/unknown'],
    )
    expect(
      await screen.findByText(
        'This asset is unavailable. Check the label or ask the society admin.',
      ),
    ).toBeVisible()
  })

  it('reveals resolved scan and suppresses reveal under reduced motion', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ asset }), { status: 200 }),
    )
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
      configurable: true,
    })
    renderWithClient(
      <Routes>
        <Route path="/scan/:qrToken" element={<ScanAssetPage />} />
      </Routes>,
      ['/scan/token'],
    )
    await waitFor(() =>
      expect(screen.getByTestId('scan-result')).toHaveAttribute(
        'data-revealed',
        'true',
      ),
    )
  })

  it('returns to encoded scan path after login', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: 'u1',
            name: 'Resident',
            email: 'r@x.test',
            role: 'resident',
            mustChangePassword: false,
          },
        }),
        { status: 200 },
      ),
    )
    renderWithClient(
      <>
        <LoginPage />
        <LocationProbe />
      </>,
      ['/login?returnTo=%2Fscan%2Ftoken'],
    )
    await user.type(screen.getByLabelText('Email'), 'r@x.test')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/scan/token'),
    )
  })

  it('renders detail identity plate', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: {
              id: 'u1',
              name: 'Admin',
              email: 'a@x.test',
              role: 'admin',
              mustChangePassword: false,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ asset }), { status: 200 }),
      )
    renderWithClient(
      <Routes>
        <Route path="/assets/:id" element={<AssetDetailPage />} />
      </Routes>,
      ['/assets/a1'],
    )
    expect(await screen.findByText('Passenger lift')).toBeVisible()
  })
})
