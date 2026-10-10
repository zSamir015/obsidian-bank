import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }))

function renderShell() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<p>Overview</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell help links', () => {
  it('opens the user guide safely in a new tab with an accessible label', () => {
    renderShell()

    for (const link of screen.getAllByRole('link', { name: 'Help (opens in a new tab)' })) {
      expect(link).toHaveAttribute('href', 'https://github.com/zSamir015/obsidian-bank/blob/main/docs/USER_GUIDE.md')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('keeps the mobile tab bar at five navigation links', () => {
    renderShell()
    expect(screen.getAllByRole('navigation', { name: 'Main' })[1]).toHaveTextContent(
      'OverviewActivityTransferBudgetsCards',
    )
  })
})
