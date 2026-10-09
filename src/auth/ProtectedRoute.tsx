import { Navigate, Outlet } from 'react-router'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) return <div className="grid min-h-dvh place-items-center text-muted">Loading…</div>
  return session ? <Outlet /> : <Navigate to="/login" replace />
}
