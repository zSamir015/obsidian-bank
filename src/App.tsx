import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Link, RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { Layout } from './components/Layout'
import { BudgetsPage } from './pages/BudgetsPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { TransferPage } from './pages/TransferPage'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <Layout />,
          children: [
            { index: true, element: <DashboardPage /> },
            { path: 'movimientos', element: <TransactionsPage /> },
            { path: 'transferir', element: <TransferPage /> },
            { path: 'presupuestos', element: <BudgetsPage /> },
          ],
        },
      ],
    },
    { path: '*', element: <NotFound /> },
  ],
  { basename: import.meta.env.BASE_URL },
)

function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center text-center">
      <div>
        <p className="font-mono text-sheen">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Página no encontrada</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-zinc-400 hover:text-zinc-100">Volver al resumen</Link>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
