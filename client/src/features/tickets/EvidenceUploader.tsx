import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import {
  useRemoveTicketEvidence,
  useUploadTicketEvidence,
  type TicketEvidence,
} from './ticket-api'

const MAX_PHOTO_BYTES = 8 * 1024 * 1024
const MAX_ACTIVE_PHOTOS = 5
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

type QueuedFile = {
  id: number
  file: File
  previewUrl: string
  status: 'uploading' | 'failed'
  error?: string | undefined
}
type Notice = { message: string; tone: 'error' | 'success' }

function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Photo upload failed. Try again.'
}

function removeErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Photo removal failed. Try again.'
}

export function EvidenceUploader({
  ticketId,
  requiredPhotoCount,
  activeEvidence,
}: {
  ticketId: string
  requiredPhotoCount: number
  activeEvidence: TicketEvidence[]
}) {
  const [queued, setQueued] = useState<QueuedFile[]>([])
  const [notice, setNotice] = useState<Notice | null>(null)
  const nextId = useRef(0)
  const queuedRef = useRef(queued)
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadTicketEvidence(ticketId)
  const remove = useRemoveTicketEvidence(ticketId)

  useEffect(() => {
    queuedRef.current = queued
  }, [queued])

  useEffect(
    () => () => {
      for (const item of queuedRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      }
    },
    [],
  )

  function revoke(item: QueuedFile) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  }

  async function uploadFile(item: QueuedFile) {
    setQueued((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? { ...candidate, status: 'uploading', error: undefined }
          : candidate,
      ),
    )
    try {
      await upload.mutateAsync(item.file)
      setQueued((current) => {
        const resolved = current.find((candidate) => candidate.id === item.id)
        if (resolved) revoke(resolved)
        return current.filter((candidate) => candidate.id !== item.id)
      })
      setNotice({ message: `${item.file.name} uploaded.`, tone: 'success' })
    } catch (error) {
      setQueued((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? { ...candidate, status: 'failed', error: errorMessage(error) }
            : candidate,
        ),
      )
      setNotice({
        message: `${item.file.name} could not be uploaded.`,
        tone: 'error',
      })
    }
  }

  function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setNotice(null)
    if (files.length === 0) return

    const remainingCapacity = Math.max(
      MAX_ACTIVE_PHOTOS - activeEvidence.length - queued.length,
      0,
    )
    if (files.length > remainingCapacity) {
      setNotice({
        message: `Select no more than ${remainingCapacity} photos.`,
        tone: 'error',
      })
      return
    }

    const accepted: QueuedFile[] = []
    for (const file of files) {
      if (file.size > MAX_PHOTO_BYTES) {
        setNotice({ message: `${file.name} exceeds 8 MiB.`, tone: 'error' })
        continue
      }
      if (!acceptedTypes.has(file.type)) {
        setNotice({
          message: `${file.name} is not a JPEG, PNG, or WebP image.`,
          tone: 'error',
        })
        continue
      }
      accepted.push({
        id: nextId.current++,
        file,
        previewUrl:
          typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(file)
            : '',
        status: 'uploading',
      })
    }
    if (accepted.length === 0) return
    setQueued((current) => [...current, ...accepted])
    for (const item of accepted) void uploadFile(item)
  }

  function removeQueued(item: QueuedFile) {
    revoke(item)
    setQueued((current) =>
      current.filter((candidate) => candidate.id !== item.id),
    )
    setNotice({ message: `${item.file.name} removed.`, tone: 'success' })
  }

  const remaining = Math.max(requiredPhotoCount - activeEvidence.length, 0)
  return (
    <div className="evidence-uploader">
      <div className="evidence-uploader-heading">
        <div>
          <h3>Active evidence</h3>
          <p>
            {activeEvidence.length} active photo
            {activeEvidence.length === 1 ? '' : 's'}
          </p>
        </div>
        <p className="evidence-readiness" aria-live="polite">
          {remaining > 0
            ? `Add ${remaining} more photo(s) before submitting.`
            : requiredPhotoCount === 0
              ? 'No photo required.'
              : 'Photo requirement met.'}
        </p>
      </div>
      <label className="evidence-file-picker">
        Add evidence photos
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={selectFiles}
        />
      </label>
      <Feedback message={notice?.message} tone={notice?.tone} />
      <Feedback
        message={remove.error ? removeErrorMessage(remove.error) : undefined}
      />
      {queued.length > 0 ? (
        <ul className="evidence-file-list" aria-label="Queued evidence photos">
          {queued.map((item) => (
            <li
              className="evidence-file-row"
              key={item.id}
              aria-busy={item.status === 'uploading'}
            >
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={`Preview of ${item.file.name}`}
                />
              ) : null}
              <span>{item.file.name}</span>
              {item.status === 'uploading' ? <span>Uploading…</span> : null}
              {item.error ? (
                <span className="feedback-error">{item.error}</span>
              ) : null}
              {item.status === 'failed' ? (
                <button type="button" onClick={() => void uploadFile(item)}>
                  Retry {item.file.name}
                </button>
              ) : null}
              <button
                type="button"
                disabled={item.status === 'uploading'}
                onClick={() => removeQueued(item)}
              >
                Remove {item.file.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {activeEvidence.length > 0 ? (
        <ul
          className="active-evidence-list"
          aria-label="Active evidence photos"
        >
          {activeEvidence.map((photo, index) => (
            <li key={photo.id}>
              <span>
                Photo {photo.displayOrder ?? index + 1} ·{' '}
                {photo.format.toUpperCase()}
              </span>
              <button
                type="button"
                disabled={remove.isPending}
                aria-busy={remove.isPending}
                onClick={() => remove.mutate(photo.id)}
              >
                Remove evidence photo {photo.displayOrder ?? index + 1}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="evidence-uploader-note">
        Each selected photo uploads separately. Server validation remains
        authoritative.
      </p>
    </div>
  )
}
