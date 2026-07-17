import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useCurrentUser } from '../features/auth/auth-api'
import type { Role } from '../features/auth/auth-api'

export function RouteGuard({ roles }: { roles?: Role[] }) {
  const location = useLocation()
  const user = useCurrentUser()
  if (user.isLoading) return <div className="loading">Checking session...</div>
  if (!user.data)
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  if (user.data.mustChangePassword && location.pathname !== '/change-password')
    return <Navigate to="/change-password" replace />
  if (roles && !roles.includes(user.data.role)) return <AccessDenied />
  return <Outlet />
}
export function PublicOnly() {
  const user = useCurrentUser()
  if (user.isLoading) return <div className="loading">Checking session...</div>
  if (user.data)
    return (
      <Navigate
        to={user.data.mustChangePassword ? '/change-password' : '/dashboard'}
        replace
      />
    )
  return <Outlet />
}
export function AccessDenied() {
  return (
    <main className="message-page">
      <p className="eyebrow">PERMISSION / 403</p>
      <h1>Access denied</h1>
      <p>Your role does not include this ledger.</p>
    </main>
  )
}
