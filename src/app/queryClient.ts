import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Always try the request: when offline, the service worker can still answer from its cache.
      networkMode: 'always',
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount, error) => {
        if (error instanceof Error && 'status' in error && error.status === 404) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
  },
})
