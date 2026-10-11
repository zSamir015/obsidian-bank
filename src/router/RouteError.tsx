import { TriangleAlert } from 'lucide-react'
import { useRouteError } from 'react-router'
import { Button, ButtonLink } from '@/components/ui/Button'
import { useI18n } from '@/i18n/useI18n'

// After a deploy, an open tab may request route chunks whose hashed names no longer exist.
const isChunkLoadError = (error: unknown) =>
  error instanceof Error &&
  /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(error.message)

export function RouteError() {
  const error = useRouteError()
  const stale = isChunkLoadError(error)
  const { t } = useI18n()
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div role="alert" className="max-w-sm text-center">
        <TriangleAlert aria-hidden="true" className="mx-auto size-6 text-danger" />
        <h1 className="mt-4 text-2xl font-medium tracking-[-0.01em]">
          {stale ? t.routeError.staleTitle : t.routeError.title}
        </h1>
        <p className="mt-2 text-muted">{stale ? t.routeError.staleBody : t.routeError.body}</p>
        <div className="mt-6">
          {stale ? (
            <Button onClick={() => window.location.reload()}>{t.routeError.reload}</Button>
          ) : (
            <ButtonLink to="/">{t.app.backToOverview}</ButtonLink>
          )}
        </div>
      </div>
    </main>
  )
}
