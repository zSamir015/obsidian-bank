import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { I18nProvider } from './i18n/I18nProvider'
import { OfflineGate } from './pwa/OfflineGate'
import { routes } from './router/routes'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

// Created on first render, not on import: a data router starts loading the current route's
// chunk straight away, and opened offline that load would fail before the connection is back.
let router: ReturnType<typeof createBrowserRouter> | undefined
function Router() {
  router ??= createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })
  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <I18nProvider>
      <OfflineGate>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </QueryClientProvider>
      </OfflineGate>
    </I18nProvider>
  )
}
