import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../app/api'

export type Society = { id: string; name: string; address: string }

export function useSociety() {
  return useQuery({
    queryKey: ['society'],
    queryFn: () => api<{ society: Society }>('/api/society'),
    select: (response) => response.society,
  })
}

export function useUpdateSociety() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: Pick<Society, 'name' | 'address'>) =>
      api<{ society: Society }>('/api/society', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (response) => client.setQueryData(['society'], response.society),
  })
}
