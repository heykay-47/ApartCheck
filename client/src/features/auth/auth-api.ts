import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../app/api'

export type Role = 'admin' | 'manager' | 'resident'
export type User = {
  id: string
  name: string
  email: string
  phone?: string
  role: Role
  societyId?: string
  unitId?: string | null
  mustChangePassword: boolean
}
type UserResponse = { user: User }

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: () => api<UserResponse>('/api/auth/me'),
    select: (response) => response.user,
  })
}
export function useLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api<UserResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => client.setQueryData(['current-user'], data),
  })
}
export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => client.setQueryData(['current-user'], undefined),
  })
}
export function useChangePassword() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api<UserResponse>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => client.setQueryData(['current-user'], data),
  })
}
