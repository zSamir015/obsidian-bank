import { TriangleAlert } from 'lucide-react'
import { useRouteError } from 'react-router'
import { Button, ButtonLink } from '@/components/ui/Button'

// After a deploy, an open tab may request route chunks whose hashed names no longer exist.
const isChunkLoadError = (error: unknown) =>
  error instanceof Error &&
  /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(error.message)

export function RouteError() {
  const error = useRouteError()
  const stale = isChunkLoadError(error)
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div role="alert" className="max-w-sm text-center">
        <TriangleAlert aria-hidden="true" className="mx-auto size-6 text-danger" />
        <h1 className="mt-4 text-2xl font-medium tracking-[-0.01em]">
          {stale ? "This page didn't load" : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-muted">
          {stale
            ? 'A newer version of Obsidian Bank is available. Reload to get it.'
            : 'This page hit an unexpected error. Go back to the overview and try again.'}
        </p>
        <div className="mt-6">
          {stale ? (
            <Button onClick={() => window.location.reload()}>Reload</Button>
          ) : (
            <ButtonLink to="/">Back to overview</ButtonLink>
          )}
        </div>
      </div>
    </main>
  )
}
