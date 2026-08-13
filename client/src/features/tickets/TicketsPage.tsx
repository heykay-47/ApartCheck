import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../auth/auth-api'
import { useTickets, ticketStatuses, type TicketStatus } from './ticket-api'

function statusLabel(status: TicketStatus) {
  return status.replaceAll('_', ' ')
}

export function TicketsPage() {
  const { data: user } = useCurrentUser()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TicketStatus | ''>('')
  const [page, setPage] = useState(1)
  const filters = {
    page,
    pageSize: 25,
    search: useDeferredValue(search),
    status,
  }
  const tickets = useTickets(filters)
  const pagination = tickets.data?.pagination
  const reportable = user?.role === 'admin' || user?.role === 'resident'

  return (
    <section className="page tickets-page">
      <p className="eyebrow">04 / MAINTENANCE RECORD</p>
      <h1>Tickets stay visible.</h1>
      <p className="lede">
        {user?.role === 'admin'
          ? 'Review every active maintenance report and its next accountable action.'
          : user?.role === 'technician'
            ? 'Follow the work assigned to you from report to verification.'
            : 'Follow your maintenance reports from first report to verified work.'}
      </p>
      <div className="ticket-toolbar">
        <label className="search-field">
          Search tickets
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Title or description"
          />
        </label>
        <label className="search-field">
          Status
          <select
            aria-label="Ticket status filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as TicketStatus | '')
              setPage(1)
            }}
          >
            <option value="">All active and terminal</option>
            {ticketStatuses.map((item) => (
              <option key={item} value={item}>
                {statusLabel(item)}
              </option>
            ))}
          </select>
        </label>
        {reportable ? (
          <Link className="primary-button" to="/tickets/new">
            Report ticket
          </Link>
        ) : null}
      </div>
      <div className="ticket-ledger">
        <div className="ticket-row ticket-header">
          <span>Title</span>
          <span>Unit</span>
          <span>Asset</span>
          <span>Status</span>
          <span>Assignee</span>
          <span>Updated</span>
        </div>
        {tickets.isLoading ? (
          <p>Loading tickets...</p>
        ) : tickets.isError ? (
          <p className="feedback-error">Tickets are unavailable. Try again.</p>
        ) : tickets.data?.tickets.length ? (
          tickets.data.tickets.map((ticket) => (
            <Link
              className="ticket-row"
              to={`/tickets/${ticket.id}`}
              key={ticket.id}
            >
              <strong data-label="Title">{ticket.title}</strong>
              <span data-label="Unit">
                {ticket.unit.building} / {ticket.unit.floor} /{' '}
                {ticket.unit.unitNumber}
              </span>
              <span data-label="Asset">
                {ticket.asset
                  ? `${ticket.asset.assetCode} — ${ticket.asset.name}`
                  : 'No linked Asset'}
              </span>
              <span data-label="Status" className="ticket-status">
                {statusLabel(ticket.status)}
              </span>
              <span data-label="Assignee">
                {ticket.assignee?.name ?? 'Unassigned'}
              </span>
              <time data-label="Updated" dateTime={ticket.updatedAt}>
                {new Date(ticket.updatedAt).toLocaleString()}
              </time>
            </Link>
          ))
        ) : (
          <p className="empty-state">
            No tickets match current ledger filters.
          </p>
        )}
      </div>
      {pagination && pagination.pages > 1 ? (
        <div className="pagination">
          <button
            className="text-button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="text-button"
            disabled={page >= pagination.pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  )
}
