import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { RouteGuard, PublicOnly } from '../components/RouteGuard'
import { LoginPage } from '../features/auth/LoginPage'
import { SetupPage } from '../features/auth/SetupPage'
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage'
import { ProfilePage } from '../features/auth/ProfilePage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ProtectedPlaceholderPage } from '../components/ProtectedPlaceholderPage'
import { AdminPlaceholderPage } from '../components/AdminPlaceholderPage'

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
          {
            path: '/assets',
            element: <ProtectedPlaceholderPage title="Asset ledger" />,
          },
          {
            path: '/assets/:id',
            element: (
              <ProtectedPlaceholderPage title="Asset detail" param="id" />
            ),
          },
          {
            path: '/scan/:qrToken',
            element: (
              <ProtectedPlaceholderPage title="Scan asset" param="qrToken" />
            ),
          },
          {
            path: '/admin',
            element: <RouteGuard roles={['admin']} />,
            children: [{ path: 'users', element: <AdminPlaceholderPage /> }],
          },
        ],
      },
    ],
  },
]
export const router = createBrowserRouter(routes)
