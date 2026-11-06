import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { queryClient } from './app/queryClient'
import { router } from './app/router'

export default function App() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (!import.meta.env.PROD) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
      return
    }
    registerSW({ immediate: true })
    // Holds opaque responses from before images used CORS; serving one makes the image fail to load.
    void caches.delete('pokemon-artwork').catch(() => undefined)
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
