import type { JSX } from 'react'

export type WorkflowStep = 'report' | 'assign' | 'complete' | 'verify'

const previewStates = {
  report: {
    status: 'Reported',
    owner: 'Society office',
    note: 'Lift doors stop short of the landing.',
  },
  assign: {
    status: 'Assigned',
    owner: 'Maya Singh · Technician',
    note: 'Inspection assigned by Administrator.',
  },
  complete: {
    status: 'Submitted',
    owner: 'Maya Singh · Technician',
    note: 'Door track cleared and alignment tested.',
  },
  verify: {
    status: 'Verified',
    owner: 'Aarav Mehta · Administrator',
    note: 'Completion reviewed and accepted.',
  },
} satisfies Record<
  WorkflowStep,
  { status: string; owner: string; note: string }
>

const history = [
  [
    'Reported',
    'Leena Rao · Resident',
    'Ticket opened from North Tower · 01-04.',
  ],
  [
    'Assigned',
    'Aarav Mehta · Administrator',
    'Maya Singh assigned for inspection.',
  ],
  [
    'Submitted',
    'Maya Singh · Technician',
    'Completion notes submitted for review.',
  ],
  [
    'Verified',
    'Aarav Mehta · Administrator',
    'Completion reviewed and accepted.',
  ],
] as const

const stepIndex: Record<WorkflowStep, number> = {
  report: 0,
  assign: 1,
  complete: 2,
  verify: 3,
}

export function ProductPreview({
  step,
  compact = false,
}: {
  step: WorkflowStep
  compact?: boolean
}): JSX.Element {
  const state = previewStates[step]
  const currentIndex = stepIndex[step]

  return (
    <article
      className={`trace-plate product-preview${compact ? ' product-preview-compact' : ''}`}
      data-step={step}
      data-compact={compact || undefined}
      aria-label="Synthetic Ticket preview"
    >
      <p className="preview-kicker">
        {compact ? 'Ticket lifecycle record' : 'Synthetic product data'}
      </p>
      <div className="preview-title-block">
        <p>Ticket · TKT-0042</p>
        <strong>Passenger lift door fault</strong>
        <p>{state.status}</p>
      </div>
      <dl className="preview-facts">
        <div className="proof-row">
          <dt>Unit</dt>
          <dd>North Tower · 01-04</dd>
        </div>
        <div className="proof-row">
          <dt>Asset</dt>
          <dd>LFT-0007 · Passenger lift</dd>
        </div>
        <div className="proof-row">
          <dt>Reporter</dt>
          <dd>Leena Rao · Resident</dd>
        </div>
        <div className="proof-row">
          <dt>Owner</dt>
          <dd>{state.owner}</dd>
        </div>
        <div className="proof-row">
          <dt>Latest note</dt>
          <dd>{state.note}</dd>
        </div>
      </dl>
      <ol className="preview-history" aria-label="Ticket history">
        {history.map(([status, actor, detail], index) => {
          const active = index <= currentIndex

          return (
            <li
              className="preview-history-row"
              data-active={active || undefined}
              data-state={active ? 'reached' : 'pending'}
              key={status}
            >
              <span>{status}</span>
              <strong>{actor}</strong>
              <p>{detail}</p>
              <small>{active ? 'Recorded' : 'Not yet reached'}</small>
            </li>
          )
        })}
      </ol>
    </article>
  )
}
