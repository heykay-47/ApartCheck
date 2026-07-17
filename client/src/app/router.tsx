import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { RouteGuard, PublicOnly, AccessDenied } from '../components/RouteGuard'
import { LoginPage } from '../features/auth/LoginPage'
import { SetupPage } from '../features/auth/SetupPage'
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage'
import { ProfilePage } from '../features/auth/ProfilePage'
import { DashboardPage } from '../features/dashboard/DashboardPage'

export const routes = [
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/setup', element: <SetupPage /> },
    ],
  },
  {
    element: <RouteGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/change-password', element: <ChangePasswordPage /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/assets', element: <DashboardPage /> },
          { path: '/assets/:id', element: <DashboardPage /> },
          { path: '/scan/:qrToken', element: <DashboardPage /> },
          {
            path: '/admin',
            element: <RouteGuard roles={['admin', 'manager']} />,
            children: [{ path: 'users', element: <AccessDenied /> }],
          },
        ],
      },
    ],
  },
]
export const router = createBrowserRouter(routes)
