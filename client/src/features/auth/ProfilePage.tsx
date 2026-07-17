import { useCurrentUser } from './auth-api'
export function ProfilePage() {
  const { data: user } = useCurrentUser()
  return (
    <section className="page">
      <p className="eyebrow">IDENTITY / PROFILE</p>
      <h1>{user?.name}</h1>
      <dl className="profile-list">
        <div>
          <dt>Email</dt>
          <dd>{user?.email}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{user?.role}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{user?.phone || 'Not recorded'}</dd>
        </div>
      </dl>
    </section>
  )
}
