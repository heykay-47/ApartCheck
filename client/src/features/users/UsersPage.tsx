import { useDeferredValue, useState } from 'react'
import { ApiError } from '../../app/api'
import { Feedback } from '../../components/Feedback'
import { TemporaryPasswordDialog } from './TemporaryPasswordDialog'
import { UserForm } from './UserForm'
import {
  useResetUserPassword,
  useSetUserStatus,
  useUsers,
  type TemporaryCredentialResponse,
  type User,
} from './user-api'

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'' | User['role']>('')
  const [active, setActive] = useState<'all' | 'true' | 'false'>('all')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [credential, setCredential] =
    useState<TemporaryCredentialResponse | null>(null)
  const deferredSearch = useDeferredValue(search)
  const users = useUsers({
    page,
    pageSize: 25,
    search: deferredSearch,
    role,
    active,
  })
  const reset = useResetUserPassword()
  const status = useSetUserStatus()
  const actionError =
    (reset.error ?? status.error) instanceof ApiError
      ? ((reset.error ?? status.error) as ApiError)
      : undefined

  function showCredential(response: TemporaryCredentialResponse) {
    setCredential(response)
    reset.reset()
  }

  function issuePassword(user: User) {
    reset.mutate(user.id, { onSuccess: showCredential })
  }

  return (
    <section className="page users-page">
      <p className="eyebrow">03 / ACCESS REGISTER</p>
      <h1>User management</h1>
      <p className="lede">
        Manage society accounts, role boundaries, and the one-time handoff that
        gets each person inside.
      </p>
      <div className="section-heading users-heading">
        <h2>User register</h2>
        <button className="primary-button" onClick={() => setShowForm(true)}>
          Create account
        </button>
      </div>
      <div className="user-filters">
        <label>
          Search users
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Name, email, or phone"
          />
        </label>
        <label>
          Role
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as typeof role)
              setPage(1)
            }}
          >
            <option value="">All roles</option>
            <option value="resident">Residents</option>
            <option value="technician">Technicians</option>
            <option value="admin">Admins</option>
          </select>
        </label>
        <label>
          Status
          <select
            value={active}
            onChange={(e) => {
              setActive(e.target.value as typeof active)
              setPage(1)
            }}
          >
            <option value="all">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
      </div>
      <Feedback message={actionError?.message} />
      {users.isLoading ? (
        <p>Loading users...</p>
      ) : users.data?.items.length ? (
        <div className="user-ledger">
          {users.data.items.map((user) => (
            <div className="user-row" key={user.id}>
              <div>
                <span>Name</span>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
              <div>
                <span>Role</span>
                <strong>{user.role}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{user.active ? 'Active' : 'Inactive'}</strong>
              </div>
              <div className="user-actions">
                <button
                  className="text-button"
                  onClick={() => {
                    setEditing(user)
                    setShowForm(true)
                  }}
                >
                  Edit account
                </button>
                <button
                  className="text-button"
                  onClick={() => issuePassword(user)}
                  aria-label={`Issue new temporary password for ${user.name}`}
                >
                  Issue new temporary password
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    status.mutate({ id: user.id, active: !user.active })
                  }
                >
                  {user.active ? 'Disable account' : 'Re-enable account'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">
          No user accounts yet. Create the first account for this society.
        </p>
      )}
      {users.data && users.data.pages > 1 ? (
        <div className="pagination">
          <button
            className="text-button"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {users.data.pages}
          </span>
          <button
            className="text-button"
            disabled={page === users.data.pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
      {showForm ? (
        <div className="credential-backdrop" role="presentation">
          <section
            className="credential-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-heading"
          >
            <p className="eyebrow">
              {editing ? 'ACCOUNT RECORD' : 'NEW ACCOUNT'}
            </p>
            <h2 id="account-heading">
              {editing ? 'Edit account' : 'Create account'}
            </h2>
            <UserForm
              {...(editing ? { user: editing } : {})}
              onSuccess={(response) => {
                setShowForm(false)
                setEditing(null)
                if (response) setCredential(response)
              }}
              onCancel={() => {
                setShowForm(false)
                setEditing(null)
              }}
            />
          </section>
        </div>
      ) : null}
      {credential ? (
        <TemporaryPasswordDialog
          credential={credential}
          onClose={() => setCredential(null)}
        />
      ) : null}
      <style>{`.users-heading{margin-top:48px}.users-heading h2{font-family:var(--font-display);font-size:2.4rem;margin:12px 0}.user-filters{display:grid;grid-template-columns:2fr 1fr 1fr;gap:16px;margin:24px 0}.user-filters label{display:grid;gap:8px;font-family:var(--font-utility);font-size:.75rem;text-transform:uppercase;letter-spacing:.08em}.user-filters input,.user-filters select,.user-form select{min-height:44px;padding:10px;border:1px solid var(--color-slate);background:var(--color-chalk);font:inherit;text-transform:none;letter-spacing:normal}.user-ledger{border-top:2px solid var(--color-slate)}.user-row{display:grid;grid-template-columns:1.5fr .8fr .8fr 1.5fr;gap:16px;align-items:center;padding:17px 0;border-bottom:1px solid rgb(32 52 59 / .35)}.user-row div{display:grid;gap:4px}.user-row span{font-family:var(--font-utility);font-size:.7rem;text-transform:uppercase;letter-spacing:.08em}.user-row small{font-size:.9rem}.user-actions{justify-items:start}.user-actions .text-button{color:var(--color-pump)}.credential-backdrop{position:fixed;inset:0;z-index:3;display:grid;place-items:center;padding:18px;background:rgb(32 52 59 / .72)}.credential-dialog{width:min(560px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:28px;background:var(--color-chalk);border:2px solid var(--color-slate);box-shadow:10px 10px 0 var(--color-slate)}.credential-dialog h2{font-family:var(--font-display);font-size:3.2rem;line-height:.95;margin:8px 0 18px}.temporary-password{font-family:var(--font-utility)!important;letter-spacing:.05em}.dialog-actions{display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-top:18px}@media(max-width:700px){.user-filters,.user-row{grid-template-columns:1fr}.users-heading{display:grid;gap:12px}.user-actions{justify-items:start}}`}</style>
    </section>
  )
}
