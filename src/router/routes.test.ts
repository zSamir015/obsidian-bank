import type { RouteObject } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import staticRoutes from './static-routes.json'

// The route table imports the app shell, which creates the Supabase client at import time.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

function collectPaths(routes: readonly RouteObject[]): string[] {
  return routes.flatMap((route) => [
    ...(route.path && route.path !== '*' ? [route.path.replace(/^\//, '')] : []),
    ...collectPaths(route.children ?? []),
  ])
}

describe('static-routes.json', () => {
  // scripts/pages-routes.mjs writes one <route>.html per entry so GitHub Pages serves it
  // with status 200; a route missing here would load through 404.html with status 404.
  it('lists exactly the router paths', async () => {
    const { routes } = await import('./routes')
    expect([...staticRoutes].sort()).toEqual(collectPaths(routes).sort())
  })
})
