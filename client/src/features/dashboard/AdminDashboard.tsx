import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../app/api'

type CountResponse = {
  pagination: { page: number; pageSize: number; total: number; pages: number }
}
export function AdminDashboard() {
  const results = useQueries({
    queries: ['units', 'users', 'assets'].map((resource) => ({
      queryKey: ['setup-count', resource],
      queryFn: () => api<CountResponse>(`/api/${resource}?pageSize=1`),
    })),
  })
  const labels = [
    ['units', 'Add first unit', '/admin/units'],
    ['users', 'Invite first user', '/admin/users'],
    ['assets', 'Register first asset', '/assets'],
  ] as const
  return (
    <section className="page">
      <p className="eyebrow">01 / ADMIN DESK</p>
      <h1>Make setup visible.</h1>
      <p className="lede">
        Three records turn an empty society into a working maintenance desk.
      </p>
      <div className="setup-checklist">
        {labels.map(([resource, action, href], index) => (
          <Link className="setup-row" to={href} key={resource}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>
              {results[index]?.data?.pagination.total
                ? `${results[index].data?.pagination.total} ${resource}`
                : action}
            </strong>
            <span>
              {results[index]?.data?.pagination.total
                ? 'Recorded'
                : 'Start here'}{' '}
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
