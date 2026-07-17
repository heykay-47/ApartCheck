import { useCurrentUser } from '../auth/auth-api'
import { AdminDashboard } from './AdminDashboard'
import { AssetDashboard } from './AssetDashboard'

export function DashboardPage() {
  const { data: user } = useCurrentUser()
  return user?.role === 'admin' ? <AdminDashboard /> : <AssetDashboard />
}
