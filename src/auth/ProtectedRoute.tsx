import { Navigate, Outlet } from 'react-router'
import { useI18n } from '@/i18n/useI18n'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const { t } = useI18n()
  if (loading) return <div className="grid min-h-dvh place-items-center text-muted">{t.app.loading}</div>
  return session ? <Outlet /> : <Navigate to="/login" replace />
}
