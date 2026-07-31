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
          ['/admin/units', 'Units'],
          ['/admin/society', 'Society settings'],
          ['/admin/assets', 'Admin assets'],
        ]
      : [
          ['/dashboard', 'Dashboard'],
          ['/assets', 'Asset ledger'],
        ]
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
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
      <main className="work-surface" id="main-content" tabIndex={-1}>
        <header className="surface-header">
          <span>FIELD RECORD / {new Date().getFullYear()}</span>
          <span>{user?.role?.toUpperCase()}</span>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
