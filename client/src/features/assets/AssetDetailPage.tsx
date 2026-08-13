import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Feedback } from '../../components/Feedback'
import { useCurrentUser } from '../auth/auth-api'
import { useAssetTickets } from '../tickets/ticket-api'
import { AssetForm } from './AssetForm'
import { AssetIdentityPlate } from './AssetIdentityPlate'
import { useArchiveAsset, useAsset } from './asset-api'

export function AssetDetailPage() {
  const { id = '' } = useParams()
  const { data: user } = useCurrentUser()
  const asset = useAsset(id)
  const archive = useArchiveAsset()
  const [editing, setEditing] = useState(false)
  const [ticketPage, setTicketPage] = useState(1)
  const activeTickets = useAssetTickets(
    id,
    { page: ticketPage, pageSize: 25, search: '', status: '' },
    Boolean(asset.data),
  )
  if (asset.isLoading)
    return (
      <section className="page">
        <p>Loading asset...</p>
      </section>
    )
  if (!asset.data)
    return (
      <section className="message-page">
        <p className="eyebrow">RECORD / UNAVAILABLE</p>
        <p>
          This asset is unavailable. Check the label or ask the society admin.
        </p>
      </section>
    )
  const reportable = user?.role === 'admin' || user?.role === 'resident'
  return (
    <section className="page asset-detail">
      <p className="eyebrow">ASSET DETAIL / {asset.data.assetCode}</p>
      <AssetIdentityPlate asset={asset.data} allowQr={user?.role === 'admin'} />
      <div className="asset-actions">
        <Link className="text-button" to="/assets">
          Back to ledger
        </Link>
        {reportable ? (
          <Link
            className="primary-button"
            to={`/tickets/new?assetId=${encodeURIComponent(asset.data.id)}`}
          >
            Report ticket
          </Link>
        ) : null}
        {user?.role === 'admin' ? (
          <>
            <button
              className="text-button"
              onClick={() => setEditing(!editing)}
            >
              {editing ? 'Cancel edit' : 'Edit asset'}
            </button>
            <button
              className="text-button destructive"
              onClick={() => archive.mutate(asset.data!.id)}
            >
              Archive asset
            </button>
            <button className="text-button" onClick={() => window.print()}>
              Print asset label
            </button>
          </>
        ) : null}
      </div>
      {editing ? (
        <AssetForm asset={asset.data} onSaved={() => setEditing(false)} />
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
                <span>
                  {ticket.unit.building} / {ticket.unit.floor} /{' '}
                  {ticket.unit.unitNumber}
                </span>
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
