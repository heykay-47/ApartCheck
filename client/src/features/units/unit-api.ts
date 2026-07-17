import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../app/api'

export type Unit = {
  id: string
  building: string
  floor: string
  unitNumber: string
}
export type UnitFilters = { page: number; pageSize: number; search: string }
export type UnitList = UnitFilters & {
  units: Unit[]
  pagination: { page: number; pageSize: number; total: number; pages: number }
}

export function useUnits(filters: UnitFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    ...(filters.search ? { search: filters.search } : {}),
  })
  return useQuery({
    queryKey: ['units', filters],
    queryFn: () => api<UnitList>(`/api/units?${params}`),
  })
}

export function useCreateUnit() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<Unit, 'id'>) =>
      api<{ unit: Unit }>('/api/units', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['units'] }),
  })
}

export function useArchiveUnit() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/api/units/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      client.setQueriesData<UnitList>({ queryKey: ['units'] }, (current) => {
        if (!current) return current
        const units = current.units.filter((unit) => unit.id !== id)
        return {
          ...current,
          units,
          pagination: {
            ...current.pagination,
            total: Math.max(0, current.pagination.total - 1),
          },
        }
      })
      return client.invalidateQueries({ queryKey: ['units'] })
    },
  })
}
