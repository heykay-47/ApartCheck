import type { Role } from '../auth/auth-api'
import { EvidenceAttemptGallery } from './EvidenceAttemptGallery'
import { EvidenceUploader } from './EvidenceUploader'
import { PhotoRequirementControl } from './PhotoRequirementControl'
import type { Ticket } from './ticket-api'

export function TicketEvidenceSection({
  ticket,
  role,
  isAssignedTechnician,
}: {
  ticket: Ticket
  role: Role | undefined
  isAssignedTechnician: boolean
}) {
  const uploadLegal = ['assigned', 'in_progress'].includes(ticket.status)
  const hasEligibleAssignee =
    ticket.assignee?.active === true && ticket.assignee.role === 'technician'
  return (
    <section
      className="ticket-evidence-section ruled-panel"
      aria-labelledby="completion-evidence-title"
    >
      <div className="section-heading">
        <h2 id="completion-evidence-title">Completion evidence</h2>
        <span className="record-count">
          {ticket.evidenceAttempts.length} attempt
          {ticket.evidenceAttempts.length === 1 ? '' : 's'}
        </span>
      </div>
      {role === 'admin' && uploadLegal && hasEligibleAssignee ? (
        <PhotoRequirementControl
          ticketId={ticket.id}
          requiredPhotoCount={ticket.requiredPhotoCount}
        />
      ) : null}
      {isAssignedTechnician && uploadLegal ? (
        <EvidenceUploader
          ticketId={ticket.id}
          requiredPhotoCount={ticket.requiredPhotoCount}
          activeEvidence={ticket.activeEvidence}
        />
      ) : null}
      {ticket.evidenceAttempts.length > 0 ? (
        <EvidenceAttemptGallery
          ticketId={ticket.id}
          attempts={ticket.evidenceAttempts}
        />
      ) : (
        <p className="empty-state">No immutable submission attempts yet.</p>
      )}
    </section>
  )
}
