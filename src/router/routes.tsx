import type { RouteObject } from 'react-router'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AppShell } from '@/components/AppShell'
import { legacyRedirects } from './legacyRedirects'
import { RouteError } from './RouteError'

// Every page is its own chunk: heavy dependencies (charts, later 3D) only load with their route.
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await load()).default,
})

export const routes: RouteObject[] = [
  { path: '/login', lazy: page(() => import('@/pages/LoginPage')), errorElement: <RouteError /> },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            errorElement: <RouteError />,
            children: [
              { index: true, lazy: page(() => import('@/pages/overview/OverviewPage')) },
              { path: 'activity', lazy: page(() => import('@/pages/TransactionsPage')) },
              { path: 'transfer', lazy: page(() => import('@/pages/TransferPage')) },
              { path: 'budgets', lazy: page(() => import('@/pages/BudgetsPage')) },
              ...legacyRedirects,
            ],
          },
        ],
      },
    ],
  },
  { path: '*', lazy: page(() => import('@/pages/NotFoundPage')) },
]
