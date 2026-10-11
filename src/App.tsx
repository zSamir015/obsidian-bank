import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { I18nProvider } from './i18n/I18nProvider'
import { routes } from './router/routes'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })

export default function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </I18nProvider>
  )
}
