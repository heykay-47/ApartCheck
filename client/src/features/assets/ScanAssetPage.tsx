import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Feedback } from '../../components/Feedback'
import { useCurrentUser } from '../auth/auth-api'
import { useAssetTickets } from '../tickets/ticket-api'
import { AssetIdentityPlate } from './AssetIdentityPlate'
import { useScanAsset } from './asset-api'

export function ScanAssetPage() {
  const { qrToken = '' } = useParams()
  const scan = useScanAsset(qrToken)
  const { data: user } = useCurrentUser()
  const [revealed, setRevealed] = useState(false)
  const [ticketPage, setTicketPage] = useState(1)
  const activeTickets = useAssetTickets(
    scan.data?.id ?? '',
    { page: ticketPage, pageSize: 25, search: '', status: '' },
    Boolean(scan.data),
  )
  useEffect(() => {
    if (!scan.data) return
    const reduce =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (reduce) {
      setRevealed(true)
      return
    }
    const timer = window.setTimeout(() => setRevealed(true), 250)
    return () => window.clearTimeout(timer)
  }, [scan.data])
  if (scan.isLoading)
    return (
      <section className="page">
        <p className="eyebrow">SCAN / RESOLVING</p>
        <h1>Scan asset</h1>
        <p className="asset-code">{qrToken}</p>
        <p>Resolving asset label...</p>
      </section>
    )
  if (scan.isError || !scan.data)
    return (
      <section className="message-page unavailable-state">
        <p className="eyebrow">SCAN / UNAVAILABLE</p>
        <p>
          This asset is unavailable. Check the label or ask the society admin.
        </p>
      </section>
    )
  const reportable = user?.role === 'admin' || user?.role === 'resident'
  return (
    <section className="page scan-page">
      <p className="eyebrow">SCAN / VERIFIED</p>
      <div
        data-testid="scan-result"
        data-revealed={revealed}
        className="scan-result"
      >
        <AssetIdentityPlate asset={scan.data} />
      </div>
      {reportable ? (
        <Link
          className="primary-button"
          to={`/tickets/new?assetId=${encodeURIComponent(scan.data.id)}`}
        >
          Report ticket
        </Link>
      ) : null}
      <section className="asset-tickets ruled-panel">
        <h2>Active tickets</h2>
        {activeTickets.isLoading ? (
          <p>Loading active tickets...</p>
        ) : activeTickets.isError ? (
          <Feedback message="Active tickets are unavailable. Try again." />
        ) : activeTickets.data?.tickets.length ? (
          <div className="ticket-events">
            {activeTickets.data.tickets.map((ticket) => (
              <Link
                className="ticket-event"
                to={`/tickets/${ticket.id}`}
                key={ticket.id}
              >
                <strong>{ticket.title}</strong>
                <span className="ticket-status">
                  {ticket.status.replaceAll('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">No active tickets visible to you.</p>
        )}
        {activeTickets.data?.pagination.pages &&
        activeTickets.data.pagination.pages > 1 ? (
          <div className="pagination">
            <button
              className="text-button"
              disabled={ticketPage <= 1}
              onClick={() => setTicketPage(ticketPage - 1)}
            >
              Previous
            </button>
            <span>
              Page {ticketPage} of {activeTickets.data.pagination.pages}
            </span>
            <button
              className="text-button"
              disabled={ticketPage >= activeTickets.data.pagination.pages}
              onClick={() => setTicketPage(ticketPage + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </section>
    </section>
  )
}
