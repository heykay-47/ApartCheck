import { useState, type FormEvent, type RefObject } from 'react'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { FormField } from '../../components/FormField'
import { Modal } from '../../components/Modal'
import type { Ticket } from './ticket-api'

type SubmitAction = {
  mutate: (
    input: { completionSummary: string },
    options?: { onSuccess?: () => void },
  ) => void
  isPending: boolean
  error: unknown
  reset: () => void
}

export function CompletionSubmissionDialog({
  ticket,
  action,
  onClose,
  fallbackFocusRef,
}: {
  ticket: Ticket
  action: SubmitAction
  onClose: () => void
  fallbackFocusRef: RefObject<HTMLElement | null>
}) {
  const [summary, setSummary] = useState('')
  const remaining = Math.max(
    ticket.requiredPhotoCount - ticket.activeEvidence.length,
    0,
  )
  const ready = remaining === 0
  const error = action.error instanceof ApiError ? action.error : undefined

  function dismiss() {
    action.reset()
    setSummary('')
    onClose()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready) return
    action.mutate(
      { completionSummary: summary },
      {
        onSuccess: () => {
          action.reset()
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      labelledBy="completion-submission-title"
      className="credential-dialog"
      onClose={dismiss}
      fallbackFocusRef={fallbackFocusRef}
    >
      <form onSubmit={submit} noValidate>
        <h2 id="completion-submission-title">Submit completion</h2>
        <p role="status" aria-live="polite">
          {ready
            ? ticket.requiredPhotoCount === 0
              ? 'No photo required.'
              : 'Photo requirement met.'
            : `Add ${remaining} more photo(s) before submitting.`}
        </p>
        <FormField
          label="Completion summary"
          error={error?.fieldErrors.completionSummary?.[0]}
        >
          {(id) => (
            <textarea
              id={id}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={7}
            />
          )}
        </FormField>
        <Feedback message={error?.message} />
        <div className="dialog-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={action.isPending || !ready}
            aria-busy={action.isPending}
          >
            {action.isPending ? 'Submitting…' : 'Confirm submission'}
          </button>
          <button className="text-button" type="button" onClick={dismiss}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
