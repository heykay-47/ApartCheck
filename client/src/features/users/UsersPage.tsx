import { useDeferredValue, useEffect, useState } from 'react'
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
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({})
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
  useEffect(() => {
    setStatusErrors({})
  }, [users.dataUpdatedAt])
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

  function setUserStatus(user: User) {
    status.mutate(
      { id: user.id, active: !user.active },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'LAST_ACTIVE_ADMIN') {
            setStatusErrors((current) => ({
              ...current,
              [user.id]: error.message,
            }))
          }
        },
      },
    )
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
      ) : users.data?.users.length ? (
        <div className="user-ledger">
          {users.data.users.map((user) => (
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
                  disabled={reset.isPending}
                >
                  Issue new temporary password
                </button>
                <button
                  className="text-button"
                  onClick={() => setUserStatus(user)}
                  disabled={status.isPending || Boolean(statusErrors[user.id])}
                >
                  {user.active ? 'Disable account' : 'Re-enable account'}
                </button>
                {statusErrors[user.id] ? (
                  <small role="status">{statusErrors[user.id]}</small>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">
          No user accounts yet. Create the first account for this society.
        </p>
      )}
      {users.data && users.data.pagination.pages > 1 ? (
        <div className="pagination">
          <button
            className="text-button"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {users.data.pagination.pages}
          </span>
          <button
            className="text-button"
            disabled={page === users.data.pagination.pages}
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
    </section>
  )
}
