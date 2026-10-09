import { Navigate, type RouteObject } from 'react-router'

// The first version shipped Spanish URLs; keep old links working.
export const legacyRedirects: RouteObject[] = [
  { path: 'movimientos', element: <Navigate to="/activity" replace /> },
  { path: 'transferir', element: <Navigate to="/transfer" replace /> },
  { path: 'presupuestos', element: <Navigate to="/budgets" replace /> },
]
