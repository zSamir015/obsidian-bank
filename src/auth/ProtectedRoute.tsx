import { Navigate, Outlet } from 'react-router'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) return <div className="grid min-h-dvh place-items-center text-zinc-500">Cargando…</div>
  return session ? <Outlet /> : <Navigate to="/login" replace />
}
