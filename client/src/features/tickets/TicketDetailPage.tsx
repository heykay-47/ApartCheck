import { useRef, useState, type FormEvent, type RefObject } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { FormField } from '../../components/FormField'
import { Modal } from '../../components/Modal'
import { useCurrentUser } from '../auth/auth-api'
import {
  useArchiveTicket,
  useAssignTicket,
  useCancelTicket,
  useEligibleTechnicians,
  useReopenTicket,
  useReturnTicket,
  useStartTicketWork,
  useSubmitTicket,
  useTicket,
  useVerifyTicket,
  type Ticket,
  type TicketEvent,
} from './ticket-api'
import { formatTicketDate, statusLabel } from './ticket-format'

function eventText(event: TicketEvent) {
  const labels: Record<string, string> = {
    created: 'reported this ticket',
    assigned: 'assigned the ticket',
    reassigned: 'reassigned the ticket',
    work_started: 'started work',
    submitted_for_verification: 'submitted work for verification',
    returned: 'returned the work for rework',
    verified: 'verified the completed work',
    reopened: 'reopened the ticket',
    cancelled: 'cancelled the ticket',
    archived: 'archived the ticket',
  }
  return labels[event.type] ?? event.type
}

export function TicketDetailPage() {
  const { id = '' } = useParams()
  const { data: user } = useCurrentUser()
  const ticket = useTicket(id)
  const statusHeadingRef = useRef<HTMLHeadingElement>(null)
  const archive = useArchiveTicket()
  const start = useStartTicketWork(id)
  const verify = useVerifyTicket(id)
  const submit = useSubmitTicket(id)
  const returnWork = useReturnTicket(id)
  const reopen = useReopenTicket(id)
  const cancel = useCancelTicket(id)
  const [dialog, setDialog] = useState<
    'assign' | 'submit' | 'return' | 'reopen' | 'cancel' | null
  >(null)
  const [confirming, setConfirming] = useState<
    'start' | 'verify' | 'archive' | null
  >(null)
  if (ticket.isLoading)
    return (
      <section className="page">
        <p>Loading Ticket…</p>
      </section>
    )
  if (ticket.isError || !ticket.data)
    return (
      <section className="message-page">
        <p className="eyebrow">TICKET / UNAVAILABLE</p>
        <p>
          This ticket is unavailable. Check the record or ask the society admin.
        </p>
      </section>
    )
  const item = ticket.data
  const admin = user?.role === 'admin'
  const technician =
    user?.role === 'technician' && item.assignee?.id === user.id
  const active = [
    'open',
    'assigned',
    'in_progress',
    'awaiting_verification',
  ].includes(item.status)
  const repairRequired =
    item.status === 'completed' &&
    (!item.assignee ||
      item.assignee.active === false ||
      item.assignee.role !== 'technician')
  const canReopen =
    item.status === 'completed' &&
    !repairRequired &&
    item.unit.active &&
    (!item.asset || item.asset.active)
  const linkedUnavailable =
    item.status === 'completed' &&
    (!item.unit.active || Boolean(item.asset && !item.asset.active))
  const close = () => setDialog(null)
  return (
    <section className="page ticket-detail-page">
      <p className="eyebrow">TICKET DETAIL / {item.id}</p>
      <div className="ticket-detail-heading">
        <div>
          <h1>{item.title}</h1>
          <p className="lede">{item.description}</p>
        </div>
        <Link className="text-button" to="/tickets">
          Back to tickets
        </Link>
      </div>
      <h2
        ref={statusHeadingRef}
        tabIndex={-1}
        className="ticket-status-heading"
        aria-live="polite"
      >
        Status:{' '}
        <span className="ticket-status">{statusLabel(item.status)}</span>
      </h2>
      <div className="ticket-definition ruled-panel">
        <dl>
          <div>
            <dt>Unit</dt>
            <dd>
              {item.unit.building} / {item.unit.floor} / {item.unit.unitNumber}
              {!item.unit.active ? ' (inactive)' : ''}
            </dd>
          </div>
          <div>
            <dt>Asset</dt>
            <dd>
              {item.asset ? (
                <>
                  <Link to={`/assets/${item.asset.id}`}>
                    {item.asset.assetCode} — {item.asset.name}
                  </Link>
                  {!item.asset.active ? ' (inactive)' : ''}
                </>
              ) : (
                'No linked Asset'
              )}
            </dd>
          </div>
          <div>
            <dt>Reporter</dt>
            <dd>{item.reporter.name}</dd>
          </div>
          <div>
            <dt>Assignee</dt>
            <dd>
              {item.assignee
                ? `${item.assignee.name}${item.assignee.active === false ? ' (inactive)' : ''}`
                : 'Unassigned'}
            </dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>
              <time dateTime={item.createdAt}>
                {formatTicketDate(item.createdAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>
              <time dateTime={item.updatedAt}>
                {formatTicketDate(item.updatedAt)}
              </time>
            </dd>
          </div>
        </dl>
      </div>
      <div className="ticket-actions" role="group" aria-label="Ticket actions">
        {admin &&
        (['open', 'assigned', 'in_progress'].includes(item.status) ||
          repairRequired) ? (
          <button
            className="primary-button"
            onClick={() => setDialog('assign')}
          >
            {repairRequired
              ? 'Repair assignment'
              : item.assignee
                ? 'Reassign technician'
                : 'Assign technician'}
          </button>
        ) : null}
        {admin && item.status === 'awaiting_verification' ? (
          <>
            <button
              className="primary-button"
              onClick={() => setConfirming('verify')}
            >
              Verify work
            </button>
            <button className="text-button" onClick={() => setDialog('return')}>
              Return for rework
            </button>
          </>
        ) : null}
        {admin && item.status === 'completed' ? (
          <button
            className="text-button"
            disabled={!canReopen}
            title={
              linkedUnavailable
                ? 'Reopening requires all linked records to be active.'
                : undefined
            }
            onClick={() => setDialog('reopen')}
          >
            Reopen
          </button>
        ) : null}
        {admin && active ? (
          <button
            className="text-button destructive"
            onClick={() => setDialog('cancel')}
          >
            Cancel ticket
          </button>
        ) : null}
        {admin && ['completed', 'cancelled'].includes(item.status) ? (
          <button
            className="text-button destructive"
            onClick={() => setConfirming('archive')}
          >
            Archive ticket
          </button>
        ) : null}
        {technician && item.status === 'assigned' ? (
          <button
            className="primary-button"
            onClick={() => setConfirming('start')}
          >
            Start work
          </button>
        ) : null}
        {technician && item.status === 'in_progress' ? (
          <button
            className="primary-button"
            onClick={() => setDialog('submit')}
          >
            Submit completion
          </button>
        ) : null}
      </div>
      {linkedUnavailable ? (
        <Feedback message="Reopening requires all linked records to be active." />
      ) : null}
      <section className="ticket-history ruled-panel">
        <h2>Immutable history</h2>
        <div className="ticket-events">
          {item.events.map((event) => (
            <article className="ticket-event" key={event.id}>
              <div>
                <strong>{event.actor.name}</strong> {eventText(event)}
              </div>
              <p>
                {event.fromStatus ? `${statusLabel(event.fromStatus)} → ` : ''}
                {statusLabel(event.toStatus)}
                {event.assignee ? ` · ${event.assignee.name}` : ''}
              </p>
              {event.note ? <blockquote>{event.note}</blockquote> : null}
              <time dateTime={event.createdAt}>
                {formatTicketDate(event.createdAt)}
              </time>
            </article>
          ))}
        </div>
      </section>
      {dialog === 'assign' ? (
        <AssignmentDialog
          ticket={item}
          onClose={close}
          fallbackFocusRef={statusHeadingRef}
        />
      ) : null}
      {dialog === 'submit' ? (
        <TextActionDialog
          title="Submit completion"
          label="Completion summary"
          action={submit}
          buildInput={(value) => ({ completionSummary: value })}
          onClose={close}
          fallbackFocusRef={statusHeadingRef}
        />
      ) : null}
      {dialog === 'return' ? (
        <TextActionDialog
          title="Return for rework"
          label="Reason"
          action={returnWork}
          buildInput={(value) => ({ reason: value })}
          onClose={close}
          fallbackFocusRef={statusHeadingRef}
        />
      ) : null}
      {dialog === 'reopen' ? (
        <TextActionDialog
          title="Reopen ticket"
          label="Reason"
          action={reopen}
          buildInput={(value) => ({ reason: value })}
          onClose={close}
          fallbackFocusRef={statusHeadingRef}
        />
      ) : null}
      {dialog === 'cancel' ? (
        <TextActionDialog
          title="Cancel ticket"
          label="Reason"
          action={cancel}
          buildInput={(value) => ({ reason: value })}
          onClose={close}
          fallbackFocusRef={statusHeadingRef}
        />
      ) : null}
      {confirming === 'start' ? (
        <ConfirmDialog
          title="Start work?"
          message="This records that the assigned Technician has started work."
          pending={start.isPending}
          onConfirm={() =>
            start.mutate(undefined, {
              onSuccess: () => {
                setConfirming(null)
                start.reset()
              },
            })
          }
          onClose={() => setConfirming(null)}
          fallbackFocusRef={statusHeadingRef}
        />
      ) : null}
      {confirming === 'verify' ? (
        <ConfirmDialog
          title="Verify completed work?"
          message="This closes the ticket as completed."
          pending={verify.isPending}
          onConfirm={() =>
            verify.mutate(undefined, {
              onSuccess: () => {
                setConfirming(null)
                verify.reset()
              },
            })
          }
          onClose={() => setConfirming(null)}
          fallbackFocusRef={statusHeadingRef}
        />
      ) : null}
      {confirming === 'archive' ? (
        <ConfirmDialog
          title="Archive this ticket?"
          message="Archived tickets leave active ledgers but retain their immutable history."
          pending={archive.isPending}
          onConfirm={() =>
            archive.mutate(item.id, { onSuccess: () => setConfirming(null) })
          }
          onClose={() => setConfirming(null)}
          fallbackFocusRef={statusHeadingRef}
        />
      ) : null}
    </section>
  )
}

function AssignmentDialog({
  ticket,
  onClose,
  fallbackFocusRef,
}: {
  ticket: Ticket
  onClose: () => void
  fallbackFocusRef: RefObject<HTMLElement | null>
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(ticket.assignee?.id ?? '')
  const technicians = useEligibleTechnicians({ page, pageSize: 25, search })
  const assign = useAssignTicket(ticket.id)
  const error = assign.error instanceof ApiError ? assign.error : undefined
  const selectedTech = technicians.data?.technicians.find(
    (tech) => tech.id === selected,
  )
  return (
    <Modal
      labelledBy="assignment-title"
      className="credential-dialog"
      onClose={() => {
        assign.reset()
        onClose()
      }}
      fallbackFocusRef={fallbackFocusRef}
    >
      <h2 id="assignment-title">Choose technician</h2>
      <label className="search-field">
        Search active technicians
        <input
          name="technicianSearch"
          autoComplete="off"
          placeholder="Example: R. Shah or technician@example.com…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
      </label>
      <FormField
        label="Technician"
        error={error?.fieldErrors.technicianId?.[0]}
      >
        {(id) => (
          <select
            id={id}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Choose a technician</option>
            {selectedTech ? (
              <option value={selectedTech.id}>
                {selectedTech.name} — {selectedTech.email}
              </option>
            ) : null}
            {technicians.data?.technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name} — {tech.email}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <Feedback
        message={
          error?.message ??
          (technicians.data?.technicians.length === 0
            ? 'No active Technicians are available.'
            : undefined)
        }
      />
      <div className="dialog-actions">
        <button
          className="primary-button"
          disabled={!selected || assign.isPending}
          aria-busy={assign.isPending}
          onClick={() =>
            assign.mutate({ technicianId: selected }, { onSuccess: onClose })
          }
        >
          {assign.isPending ? 'Saving assignment…' : 'Save assignment'}
        </button>
        <button className="text-button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}

type TextActionInput = { reason: string } | { completionSummary: string }
function TextActionDialog<TInput extends TextActionInput>({
  title,
  label,
  action,
  buildInput,
  onClose,
  fallbackFocusRef,
}: {
  title: string
  label: string
  action: {
    mutate: (input: TInput, options?: { onSuccess?: () => void }) => void
    isPending: boolean
    error: unknown
    reset: () => void
  }
  buildInput: (value: string) => TInput
  onClose: () => void
  fallbackFocusRef: RefObject<HTMLElement | null>
}) {
  const [value, setValue] = useState('')
  const error = action.error instanceof ApiError ? action.error : undefined
  function dismiss() {
    action.reset()
    setValue('')
    onClose()
  }
  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    action.mutate(buildInput(value), {
      onSuccess: () => {
        action.reset()
        onClose()
      },
    })
  }
  return (
    <Modal
      labelledBy="text-action-title"
      className="credential-dialog"
      onClose={dismiss}
      fallbackFocusRef={fallbackFocusRef}
    >
      <form onSubmit={submitForm} noValidate>
        <h2 id="text-action-title">{title}</h2>
        <FormField
          label={label}
          error={
            error?.fieldErrors.reason?.[0] ??
            error?.fieldErrors.completionSummary?.[0]
          }
        >
          {(id) => (
            <textarea
              id={id}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              rows={7}
            />
          )}
        </FormField>
        <Feedback message={error?.message} />
        <div className="dialog-actions">
          <button
            className="primary-button"
            disabled={action.isPending}
            aria-busy={action.isPending}
            type="submit"
          >
            {action.isPending ? 'Saving…' : 'Confirm'}
          </button>
          <button className="text-button" type="button" onClick={dismiss}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ConfirmDialog({
  title,
  message,
  pending,
  onConfirm,
  onClose,
  fallbackFocusRef,
}: {
  title: string
  message: string
  pending: boolean
  onConfirm: () => void
  onClose: () => void
  fallbackFocusRef: RefObject<HTMLElement | null>
}) {
  return (
    <Modal
      labelledBy="confirm-title"
      className="credential-dialog"
      onClose={onClose}
      fallbackFocusRef={fallbackFocusRef}
    >
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      <div className="dialog-actions">
        <button
          className="primary-button"
          disabled={pending}
          aria-busy={pending}
          onClick={onConfirm}
        >
          {pending ? 'Saving…' : 'Confirm'}
        </button>
        <button className="text-button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}
