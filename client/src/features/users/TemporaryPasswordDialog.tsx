import type { TemporaryCredentialResponse } from './user-api'
import { Modal } from '../../components/Modal'

export function TemporaryPasswordDialog({
  credential,
  onClose,
}: {
  credential: TemporaryCredentialResponse
  onClose: () => void
}) {
  async function copyPassword() {
    await navigator.clipboard.writeText(credential.temporaryPassword)
  }

  return (
    <Modal
      className="credential-dialog"
      labelledBy="temporary-password-heading"
      onClose={onClose}
    >
      <p className="eyebrow">ONE-TIME HANDOFF</p>
      <h2 id="temporary-password-heading">Share temporary password</h2>
      <p>
        Share this credential with {credential.user.name} at{' '}
        {credential.user.email}. It will not be available after this dialog
        closes.
      </p>
      <label className="field">
        Temporary password
        <input
          className="temporary-password"
          value={credential.temporaryPassword}
          readOnly
          aria-label="Temporary password"
        />
      </label>
      <div className="dialog-actions">
        <button className="text-button" type="button" onClick={copyPassword}>
          Copy password
        </button>
        <button className="primary-button" type="button" onClick={onClose}>
          I have shared it
        </button>
      </div>
    </Modal>
  )
}
