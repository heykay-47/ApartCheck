import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { RouteGuard, PublicOnly } from '../components/RouteGuard'
import { LoginPage } from '../features/auth/LoginPage'
import { SetupPage } from '../features/auth/SetupPage'
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage'
import { ProfilePage } from '../features/auth/ProfilePage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { SocietySettingsPage } from '../features/society/SocietySettingsPage'
import { UnitsPage } from '../features/units/UnitsPage'
import { UsersPage } from '../features/users/UsersPage'
import { AssetsPage } from '../features/assets/AssetsPage'
import { AssetDetailPage } from '../features/assets/AssetDetailPage'
import { ScanAssetPage } from '../features/assets/ScanAssetPage'
import { AssetForm } from '../features/assets/AssetForm'

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
            element: <AssetsPage />,
          },
          {
            path: '/assets/:id',
            element: <AssetDetailPage />,
          },
          {
            path: '/scan/:qrToken',
            element: <ScanAssetPage />,
          },
          {
            path: '/admin',
            element: <RouteGuard roles={['admin']} />,
            children: [
              { path: 'users', element: <UsersPage /> },
              { path: 'units', element: <UnitsPage /> },
              { path: 'society', element: <SocietySettingsPage /> },
              { path: 'assets', element: <AssetForm /> },
            ],
          },
        ],
      },
    ],
  },
]
export const router = createBrowserRouter(routes)
