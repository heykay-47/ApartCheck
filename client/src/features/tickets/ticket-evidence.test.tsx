import { createRef } from 'react'
import { readFileSync } from 'node:fs'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, sessionRequest } from '../../app/api'
import { queryClient } from '../../app/query-client'
import { FormField } from '../../components/FormField'
import { CompletionSubmissionDialog } from './CompletionSubmissionDialog'
import { EvidenceAttemptGallery } from './EvidenceAttemptGallery'
import { EvidenceUploader } from './EvidenceUploader'
import { TicketEvidenceSection } from './TicketEvidenceSection'
import type {
  Ticket,
  TicketEvidence,
  TicketEvidenceAttempt,
} from './ticket-api'

const globalCss = readFileSync('src/styles/global.css', 'utf8')

const evidence: TicketEvidence = {
  id: 'e1',
  format: 'png',
  byteSize: 1200,
  width: 800,
  height: 600,
  displayOrder: 1,
  state: 'active',
  evidenceSetNumber: null,
  createdAt: '2026-01-02T10:00:00.000Z',
  sealedAt: null,
}

const attempt: TicketEvidenceAttempt = {
  setNumber: 1,
  submittedBy: { id: 't1', name: 'Technician One' },
  submittedAt: '2026-01-02T12:00:00.000Z',
  outcome: 'verified',
  photos: [
    {
      ...evidence,
      id: 'sealed-1',
      state: 'sealed',
      evidenceSetNumber: 1,
      sealedAt: '2026-01-02T12:00:00.000Z',
    },
  ],
}

const ticket: Ticket = {
  id: 't1',
  title: 'Lift vibration',
  description: 'The passenger lift vibrates during travel.',
  status: 'in_progress',
  requiredPhotoCount: 2,
  unit: {
    id: 'u1',
    building: 'Tower A',
    floor: '4',
    unitNumber: '401',
    active: true,
  },
  asset: null,
  reporter: { id: 'r1', name: 'Resident One' },
  assignee: {
    id: 't1',
    name: 'Technician One',
    active: true,
    role: 'technician',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T12:30:00.000Z',
  activeEvidence: [],
  evidenceAttempts: [],
  events: [],
}

function renderWithClient(element: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>,
  )
}

describe('Ticket evidence client workflow', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
  })
  afterEach(cleanup)

  it('does not overwrite the browser multipart boundary', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}'))
    const body = new FormData()
    body.append(
      'photos',
      new File(['proof'], 'proof.png', { type: 'image/png' }),
    )

    await sessionRequest(
      '/api/tickets/t1/evidence',
      {
        method: 'POST',
        body,
      },
      (response) => response.json(),
    )

    const init = fetchMock.mock.calls[0]?.[1]
    expect(init?.body).toBe(body)
    expect(new Headers(init?.headers).has('Content-Type')).toBe(false)
  })

  it('exposes the exact image input contract and uploads each file independently', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input)
        if (url === '/api/tickets/t1/evidence')
          return new Response(JSON.stringify({ evidence: [evidence] }), {
            status: 201,
          })
        if (url === '/api/tickets/t1')
          return new Response(
            JSON.stringify({
              ticket: { ...ticket, activeEvidence: [evidence] },
            }),
          )
        return new Response('{}')
      })
    const actor = userEvent.setup()
    renderWithClient(
      <EvidenceUploader
        ticketId="t1"
        requiredPhotoCount={2}
        activeEvidence={[]}
      />,
    )

    const fileInput = screen.getByLabelText('Add evidence photos')
    expect(fileInput).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp',
    )
    expect(fileInput).toHaveAttribute('multiple')
    await actor.upload(fileInput, [
      new File(['one'], 'one.png', { type: 'image/png' }),
      new File(['two'], 'two.png', { type: 'image/png' }),
    ])

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(
          ([input]) => String(input) === '/api/tickets/t1/evidence',
        ),
      ).toHaveLength(2),
    )
    for (const [input, init] of fetchMock.mock.calls.filter(
      ([request]) => String(request) === '/api/tickets/t1/evidence',
    )) {
      expect(input).toBe('/api/tickets/t1/evidence')
      expect(init?.body).toBeInstanceOf(FormData)
      expect(new Headers(init?.headers).has('Content-Type')).toBe(false)
    }
  })

  it('rejects oversized files and selections above remaining capacity immediately', async () => {
    const actor = userEvent.setup()
    renderWithClient(
      <EvidenceUploader
        ticketId="t1"
        requiredPhotoCount={2}
        activeEvidence={[evidence, { ...evidence, id: 'e2', displayOrder: 2 }]}
      />,
    )

    const fileInput = screen.getByLabelText('Add evidence photos')
    await actor.upload(
      fileInput,
      new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'large.png', {
        type: 'image/png',
      }),
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'large.png exceeds 8 MiB.',
    )

    await actor.upload(fileInput, [
      new File(['one'], 'one.png', { type: 'image/png' }),
      new File(['two'], 'two.png', { type: 'image/png' }),
      new File(['three'], 'three.png', { type: 'image/png' }),
      new File(['four'], 'four.png', { type: 'image/png' }),
    ])
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Select no more than 3 photos.',
    )
  })

  it('keeps a failed file independently retryable', async () => {
    let attempts = 0
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input)
        if (url === '/api/tickets/t1/evidence') {
          attempts += 1
          return attempts === 1
            ? new Response(
                JSON.stringify({ error: { message: 'Storage unavailable.' } }),
                { status: 503 },
              )
            : new Response(JSON.stringify({ evidence: [evidence] }), {
                status: 201,
              })
        }
        return new Response('{}')
      })
    const actor = userEvent.setup()
    renderWithClient(
      <EvidenceUploader
        ticketId="t1"
        requiredPhotoCount={1}
        activeEvidence={[]}
      />,
    )

    await actor.upload(
      screen.getByLabelText('Add evidence photos'),
      new File(['proof'], 'proof.png', { type: 'image/png' }),
    )
    expect(
      await screen.findByRole('button', { name: 'Retry proof.png' }),
    ).toBeVisible()
    await actor.click(screen.getByRole('button', { name: 'Retry proof.png' }))
    await waitFor(() => expect(attempts).toBe(2))
    expect(
      fetchMock.mock.calls.filter(
        ([input]) => String(input) === '/api/tickets/t1/evidence',
      ),
    ).toHaveLength(2)
  })

  it('removes active evidence and cleans queued preview URLs', async () => {
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:proof')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL')
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input)
        if (url === '/api/tickets/t1/evidence/e1')
          return new Response(null, { status: 204 })
        return new Response('{}')
      })
    const actor = userEvent.setup()
    const view = renderWithClient(
      <EvidenceUploader
        ticketId="t1"
        requiredPhotoCount={1}
        activeEvidence={[evidence]}
      />,
    )
    expect(screen.getByText('1 active photo')).toBeVisible()
    await actor.click(
      screen.getByRole('button', { name: 'Remove evidence photo 1' }),
    )
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/tickets/t1/evidence/e1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    )
    view.unmount()
    expect(createObjectUrl).not.toHaveBeenCalled()
    expect(revokeObjectUrl).not.toHaveBeenCalled()
  })

  it('shows Administrator requirement controls only in upload-legal statuses', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ticket })))
    const actor = userEvent.setup()
    renderWithClient(
      <TicketEvidenceSection
        ticket={ticket}
        role="admin"
        isAssignedTechnician={false}
      />,
    )
    const requirement = screen.getByLabelText('Required photos')
    await actor.selectOptions(requirement, '4')
    await actor.click(
      screen.getByRole('button', { name: 'Save photo requirement' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tickets/t1/photo-requirement',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ requiredPhotoCount: 4 }),
      }),
    )
    expect(screen.queryByLabelText('Add evidence photos')).toBeNull()

    cleanup()
    renderWithClient(
      <TicketEvidenceSection
        ticket={ticket}
        role="resident"
        isAssignedTechnician={false}
      />,
    )
    expect(screen.queryByLabelText('Required photos')).toBeNull()
  })

  it('revokes a queued preview URL when the uploader unmounts', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined))
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:queued')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL')
    const actor = userEvent.setup()
    const view = renderWithClient(
      <EvidenceUploader
        ticketId="t1"
        requiredPhotoCount={1}
        activeEvidence={[]}
      />,
    )

    await actor.upload(
      screen.getByLabelText('Add evidence photos'),
      new File(['proof'], 'proof.png', { type: 'image/png' }),
    )
    expect(await screen.findByAltText('Preview of proof.png')).toBeVisible()
    view.unmount()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:queued')
  })

  it('renders immutable attempt outcomes and refreshes failed secure views', async () => {
    let views = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input) === '/api/tickets/t1/evidence/sealed-1/view') {
        views += 1
        return views === 1
          ? new Response(
              JSON.stringify({
                error: { message: 'Evidence storage is unavailable.' },
              }),
              { status: 503 },
            )
          : new Response(
              JSON.stringify({
                url: 'https://image.example/proof',
                expiresAt: '2026-01-02T12:10:00.000Z',
              }),
            )
      }
      return new Response('{}')
    })
    const actor = userEvent.setup()
    renderWithClient(
      <EvidenceAttemptGallery ticketId="t1" attempts={[attempt]} />,
    )

    expect(
      screen.getByRole('heading', { name: 'Submission attempt 1 — Verified' }),
    ).toBeVisible()
    expect(
      screen.getByRole('img', {
        name: 'Evidence photo 1 from submission attempt 1',
      }),
    ).toBeInTheDocument()
    await actor.click(
      screen.getByRole('button', {
        name: 'View evidence photo 1 from submission attempt 1',
      }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Evidence storage is unavailable.',
    )
    await actor.click(
      screen.getByRole('button', {
        name: 'Retry viewing evidence photo 1 from submission attempt 1',
      }),
    )
    const image = await screen.findByAltText(
      'Evidence photo 1 from submission attempt 1',
    )
    expect(image).toHaveAttribute('src', 'https://image.example/proof')
    fireEvent.error(image)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Evidence image could not be displayed. Try again.',
    )
    await actor.click(
      screen.getByRole('button', {
        name: 'Retry viewing evidence photo 1 from submission attempt 1',
      }),
    )
    expect(
      await screen.findByAltText('Evidence photo 1 from submission attempt 1'),
    ).toHaveAttribute('src', 'https://image.example/proof')
    expect(views).toBe(3)
    expect(queryClient.getQueryData(['ticket', 't1'])).not.toEqual(
      expect.objectContaining({ url: 'https://image.example/proof' }),
    )
  })

  it('keeps completion notes-only compatibility at zero and blocks unmet requirements', async () => {
    const action = {
      mutate: vi.fn(),
      isPending: false,
      error: null,
      reset: vi.fn(),
    }
    const actor = userEvent.setup()
    renderWithClient(
      <CompletionSubmissionDialog
        ticket={{ ...ticket, requiredPhotoCount: 2, activeEvidence: [] }}
        action={action}
        onClose={vi.fn()}
        fallbackFocusRef={createRef<HTMLElement>()}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      '2 more photos required.',
    )
    expect(
      screen.getByRole('button', { name: 'Confirm submission' }),
    ).toBeDisabled()
    cleanup()

    renderWithClient(
      <CompletionSubmissionDialog
        ticket={{ ...ticket, requiredPhotoCount: 0, activeEvidence: [] }}
        action={action}
        onClose={vi.fn()}
        fallbackFocusRef={createRef<HTMLElement>()}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('No photo required.')
    const summary = screen.getByLabelText('Completion summary')
    expect(summary).toHaveFocus()
    await actor.type(summary, 'Completed the lift guide inspection.')
    await actor.click(
      screen.getByRole('button', { name: 'Confirm submission' }),
    )
    expect(action.mutate).toHaveBeenCalledWith(
      { completionSummary: 'Completed the lift guide inspection.' },
      expect.anything(),
    )
  })

  it('keeps requirement errors visible and preserves accessible mobile controls', () => {
    const action = {
      mutate: vi.fn(),
      isPending: false,
      error: new ApiError(
        409,
        'EVIDENCE_REQUIREMENT_UNMET',
        'Add 1 more photo(s)',
      ),
      reset: vi.fn(),
    }
    renderWithClient(
      <CompletionSubmissionDialog
        ticket={{
          ...ticket,
          requiredPhotoCount: 1,
          activeEvidence: [evidence],
        }}
        action={action}
        onClose={vi.fn()}
        fallbackFocusRef={createRef<HTMLElement>()}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Add 1 more photo(s)')
    expect(globalCss).toMatch(
      /\.ticket-evidence-section[\s\S]*overflow-wrap:\s*anywhere/,
    )
    expect(globalCss).toMatch(
      /\.ticket-evidence-section \.dialog-actions > \*[\s\S]*min-height:\s*44px/,
    )
    expect(globalCss).toMatch(
      /\.evidence-file-picker:focus-within\s*\{[^}]*outline:\s*3px\s+solid\s+var\(--color-marigold\)/,
    )
  })

  it('keeps FormField errors tied to their controls', () => {
    renderWithClient(
      <FormField label="Requirement" error="Count is invalid.">
        {(id) => <input id={id} />}
      </FormField>,
    )
    const control = screen.getByLabelText('Requirement')
    expect(control).toHaveAttribute('aria-invalid', 'true')
    expect(control).toHaveAccessibleDescription('Count is invalid.')
  })
})
