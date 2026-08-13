import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: false } },
})

export async function clearSessionCaches() {
  await queryClient.cancelQueries()
  queryClient.clear()
}
