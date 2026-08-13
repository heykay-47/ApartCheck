import { useDeferredValue } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCurrentUser } from '../auth/auth-api'
import { useTickets, ticketStatuses, type TicketStatus } from './ticket-api'
import { formatTicketDate, statusLabel } from './ticket-format'

export function TicketsPage() {
  const { data: user } = useCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const rawStatus = searchParams.get('status') ?? ''
  const status: TicketStatus | '' = ticketStatuses.includes(
    rawStatus as TicketStatus,
  )
    ? (rawStatus as TicketStatus)
    : ''
  const rawPage = Number(searchParams.get('page') ?? '1')
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const deferredSearch = useDeferredValue(search)
  const filters = {
    page,
    pageSize: 25,
    search: deferredSearch,
    status,
  }
  const tickets = useTickets(filters)
  const pagination = tickets.data?.pagination
  const reportable = user?.role === 'admin' || user?.role === 'resident'

  function setFilters(next: {
    search?: string
    status?: TicketStatus | ''
    page?: number
  }) {
    const params = new URLSearchParams()
    const nextSearch = next.search ?? search
    const nextStatus = next.status ?? status
    const nextPage = next.page ?? page
    if (nextSearch) params.set('search', nextSearch)
    else params.delete('search')
    if (nextStatus) params.set('status', nextStatus)
    else params.delete('status')
    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')
    setSearchParams(params, { replace: true })
  }

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
            onChange={(event) =>
              setFilters({ search: event.target.value, page: 1 })
            }
            placeholder="Title or description"
          />
        </label>
        <label className="search-field">
          Status
          <select
            aria-label="Ticket status filter"
            value={status}
            onChange={(event) =>
              setFilters({
                status: event.target.value as TicketStatus | '',
                page: 1,
              })
            }
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
      <p className="ticket-result-count" aria-live="polite">
        {tickets.data
          ? `${tickets.data.pagination.total} ${tickets.data.pagination.total === 1 ? 'ticket' : 'tickets'} on record`
          : 'Reading Ticket ledger…'}
      </p>
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
          <p className="ticket-loading">Loading tickets…</p>
        ) : tickets.isError ? (
          <p className="feedback-error">Tickets are unavailable. Try again.</p>
        ) : tickets.data?.tickets.length ? (
          tickets.data.tickets.map((ticket) => (
            <Link
              className="ticket-row"
              to={`/tickets/${ticket.id}`}
              key={ticket.id}
              aria-label={`Open Ticket: ${ticket.title}`}
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
                {formatTicketDate(ticket.updatedAt)}
              </time>
            </Link>
          ))
        ) : (
          <p className="empty-state">
            No Tickets match these filters. Clear the search or choose another
            status.
          </p>
        )}
      </div>
      {pagination && pagination.pages > 1 ? (
        <div className="pagination">
          <button
            className="text-button"
            disabled={page <= 1}
            onClick={() => setFilters({ page: page - 1 })}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="text-button"
            disabled={page >= pagination.pages}
            onClick={() => setFilters({ page: page + 1 })}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  )
}
