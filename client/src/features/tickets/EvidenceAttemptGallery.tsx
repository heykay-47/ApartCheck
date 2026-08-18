import { useState } from 'react'
import { ApiError, getSessionGeneration } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { Modal } from '../../components/Modal'
import {
  getTicketEvidenceViewUrl,
  type TicketEvidence,
  type TicketEvidenceAttempt,
} from './ticket-api'

function outcomeLabel(outcome: TicketEvidenceAttempt['outcome']) {
  return outcome === 'awaiting_verification'
    ? 'Awaiting verification'
    : outcome === 'returned'
      ? 'Returned'
      : 'Verified'
}

function viewError(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Evidence image is unavailable. Try again.'
}

export function EvidenceAttemptGallery({
  ticketId,
  attempts,
}: {
  ticketId: string
  attempts: TicketEvidenceAttempt[]
}) {
  const [view, setView] = useState<{
    photo: TicketEvidence
    url?: string
    error?: string
    pending: boolean
  } | null>(null)

  async function load(photo: TicketEvidence) {
    const generation = getSessionGeneration()
    setView({ photo, pending: true })
    try {
      const response = await getTicketEvidenceViewUrl(ticketId, photo.id)
      if (generation !== getSessionGeneration()) return
      setView({ photo, url: response.url, pending: false })
    } catch (error) {
      if (generation !== getSessionGeneration()) return
      setView({ photo, error: viewError(error), pending: false })
    }
  }

  function imageLoadFailed(photo: TicketEvidence) {
    setView({
      photo,
      error: 'Evidence image could not be displayed. Try again.',
      pending: false,
    })
  }

  return (
    <div className="evidence-attempts">
      {attempts.map((attempt) => (
        <article className="evidence-attempt" key={attempt.setNumber}>
          <h3>
            Submission attempt {attempt.setNumber} —{' '}
            {outcomeLabel(attempt.outcome)}
          </h3>
          <p>
            Submitted by {attempt.submittedBy.name} on{' '}
            <time dateTime={attempt.submittedAt}>
              {new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(attempt.submittedAt))}
            </time>
          </p>
          <ol className="evidence-photo-list">
            {attempt.photos.map((photo, index) => {
              const photoNumber = photo.displayOrder ?? index + 1
              const label = `evidence photo ${photoNumber} from submission attempt ${attempt.setNumber}`
              const current = view?.photo.id === photo.id ? view : null
              return (
                <li className="evidence-photo" key={photo.id}>
                  {current?.url ? null : (
                    <div
                      className="evidence-photo-placeholder"
                      role="img"
                      aria-label={`Evidence photo ${photoNumber} from submission attempt ${attempt.setNumber}`}
                    >
                      Photo {photoNumber}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void load(photo)}
                    disabled={current?.pending}
                  >
                    {current?.pending ? 'Loading evidence…' : `View ${label}`}
                  </button>
                  {current?.error ? (
                    <>
                      <Feedback message={current.error} />
                      <button type="button" onClick={() => void load(photo)}>
                        Retry viewing {label}
                      </button>
                    </>
                  ) : null}
                  {current?.url ? (
                    <Modal
                      labelledBy={`evidence-view-${photo.id}`}
                      className="credential-dialog evidence-view-dialog"
                      onClose={() => setView(null)}
                    >
                      <h2 id={`evidence-view-${photo.id}`}>
                        Evidence photo {photoNumber}
                      </h2>
                      <img
                        src={current.url}
                        alt={`Evidence photo ${photoNumber} from submission attempt ${attempt.setNumber}`}
                        onError={() => imageLoadFailed(photo)}
                      />
                      <button type="button" onClick={() => setView(null)}>
                        Close photo
                      </button>
                    </Modal>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </article>
      ))}
    </div>
  )
}
