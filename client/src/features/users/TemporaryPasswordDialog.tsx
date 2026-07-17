import type { TemporaryCredentialResponse } from './user-api'

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
    <div className="credential-backdrop" role="presentation">
      <section
        className="credential-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="temporary-password-heading"
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
      </section>
    </div>
  )
}
