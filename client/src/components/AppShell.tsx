import { NavLink, Outlet } from 'react-router-dom'
import { useCurrentUser, useLogout } from '../features/auth/auth-api'

export function AppShell() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const links: [string, string][] =
    user?.role === 'admin'
      ? [
          ['/dashboard', 'Dashboard'],
          ['/assets', 'Asset ledger'],
          ['/admin/users', 'Users'],
        ]
      : [
          ['/dashboard', 'Dashboard'],
          ['/assets', 'Asset ledger'],
        ]
  return (
    <div className="app-frame">
      <aside className="utility-spine">
        <div className="brand-mark">
          APART<span>CHECK</span>
        </div>
        <p className="spine-label">MAINTENANCE ARTIFACT</p>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <button className="text-button" onClick={() => logout.mutate()}>
          Sign out
        </button>
      </aside>
      <div className="mobile-bar">
        <span className="brand-mark">
          APART<span>CHECK</span>
        </span>
        <details className="mobile-nav">
          <summary>Menu</summary>
          <nav>
            {links.map(([to, label]) => (
              <NavLink key={to} to={to}>
                {label}
              </NavLink>
            ))}
            <NavLink to="/profile">Profile</NavLink>
            <button className="text-button" onClick={() => logout.mutate()}>
              Sign out
            </button>
          </nav>
        </details>
      </div>
      <main className="work-surface">
        <header className="surface-header">
          <span>FIELD RECORD / {new Date().getFullYear()}</span>
          <span>{user?.role?.toUpperCase()}</span>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
