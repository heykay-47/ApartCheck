import { useEffect, useRef, useState } from 'react'
import {
  ApiError,
  getSessionGeneration,
  subscribeSessionGeneration,
} from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { Modal } from '../../components/Modal'
import {
  getTicketEvidenceImage,
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

function releaseEvidenceResources(
  requestRef: { current: AbortController | null },
  objectUrlRef: { current: string | null },
) {
  const request = requestRef.current
  requestRef.current = null
  request?.abort()

  const objectUrl = objectUrlRef.current
  objectUrlRef.current = null
  if (objectUrl) URL.revokeObjectURL(objectUrl)
}

export function EvidenceAttemptGallery({
  ticketId,
  attempts,
}: {
  ticketId: string
  attempts: TicketEvidenceAttempt[]
}) {
  const fallbackFocusRef = useRef<HTMLElement | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [view, setView] = useState<{
    photo: TicketEvidence
    url?: string
    error?: string
    pending: boolean
  } | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeSessionGeneration(() => {
      releaseEvidenceResources(requestRef, objectUrlRef)
      setView(null)
    })
    return () => {
      unsubscribe()
      releaseEvidenceResources(requestRef, objectUrlRef)
    }
  }, [])

  async function load(photo: TicketEvidence) {
    releaseEvidenceResources(requestRef, objectUrlRef)
    const generation = getSessionGeneration()
    const controller = new AbortController()
    requestRef.current = controller
    setView({ photo, pending: true })
    try {
      const blob = await getTicketEvidenceImage(
        ticketId,
        photo.id,
        controller.signal,
      )
      if (
        controller.signal.aborted ||
        requestRef.current !== controller ||
        generation !== getSessionGeneration()
      )
        return
      const objectUrl = URL.createObjectURL(blob)
      objectUrlRef.current = objectUrl
      setView({ photo, url: objectUrl, pending: false })
    } catch (error) {
      if (
        controller.signal.aborted ||
        requestRef.current !== controller ||
        generation !== getSessionGeneration() ||
        (error instanceof DOMException && error.name === 'AbortError')
      )
        return
      setView({ photo, error: viewError(error), pending: false })
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  function imageLoadFailed(photo: TicketEvidence) {
    releaseEvidenceResources(requestRef, objectUrlRef)
    setView({
      photo,
      error: 'Evidence image could not be displayed. Try again.',
      pending: false,
    })
  }

  function closeView() {
    releaseEvidenceResources(requestRef, objectUrlRef)
    setView(null)
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
                    onClick={(event) => {
                      fallbackFocusRef.current = event.currentTarget
                      void load(photo)
                    }}
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
                      onClose={closeView}
                      fallbackFocusRef={fallbackFocusRef}
                    >
                      <h2 id={`evidence-view-${photo.id}`}>
                        Evidence photo {photoNumber}
                      </h2>
                      <img
                        src={current.url}
                        alt={`Evidence photo ${photoNumber} from submission attempt ${attempt.setNumber}`}
                        onError={() => imageLoadFailed(photo)}
                      />
                      <button type="button" onClick={closeView}>
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
