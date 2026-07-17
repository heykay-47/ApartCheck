import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../app/api'
import type { Role } from '../auth/auth-api'

export type User = {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  societyId?: string
  unitId?: string | null
  mustChangePassword?: boolean
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type UserFilters = {
  page: number
  pageSize: number
  search: string
  role: Role | ''
  active: 'all' | 'true' | 'false'
}

export type UserList = UserFilters & {
  items: User[]
  total: number
  pages: number
}

export type TemporaryCredentialResponse = {
  user: User
  temporaryPassword: string
}

export type UserInput = {
  name: string
  email: string
  phone: string
  role: Role
  unitId?: string
}

function userParams(filters: UserFilters) {
  return new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.active !== 'all' ? { active: filters.active } : {}),
  })
}

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => api<UserList>(`/api/users?${userParams(filters)}`),
  })
}

export function useCreateUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: UserInput) =>
      api<TemporaryCredentialResponse>('/api/users', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    gcTime: 0,
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserInput }) =>
      api<{ user: User }>(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useSetUserStatus() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api<{ user: User }>(`/api/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useResetUserPassword() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<TemporaryCredentialResponse>(`/api/users/${id}/reset-password`, {
        method: 'POST',
      }),
    gcTime: 0,
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  })
}
