import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { legacyRedirects } from './legacyRedirects'
import { RouteError } from './RouteError'

function renderFailingRoute(error: unknown) {
  const router = createMemoryRouter([
    {
      path: '/',
      errorElement: <RouteError />,
      loader: () => {
        throw error
      },
      element: null,
    },
  ])
  render(<RouterProvider router={router} />)
}

describe('RouteError', () => {
  it('asks for a reload when a route chunk fails to load (stale deploy)', async () => {
    renderFailingRoute(new TypeError('Failed to fetch dynamically imported module: /assets/Overview-abc.js'))
    expect(await screen.findByRole('heading', { name: "This page didn't load" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('shows a generic error with a way back for anything else', async () => {
    renderFailingRoute(new Error('boom'))
    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to overview' })).toHaveAttribute('href', '/')
  })
})

describe('legacy Spanish routes', () => {
  function Where() {
    return <p>at {useLocation().pathname}</p>
  }

  it.each([
    ['/movimientos', '/activity'],
    ['/transferir', '/transfer'],
    ['/presupuestos', '/budgets'],
  ])('redirects %s to %s', async (from, to) => {
    const router = createMemoryRouter([...legacyRedirects, { path: '*', element: <Where /> }], {
      initialEntries: [from],
    })
    render(<RouterProvider router={router} />)
    expect(await screen.findByText(`at ${to}`)).toBeInTheDocument()
  })
})
