import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), signInAnonymously: vi.fn() }))
vi.mock('@/auth/useAuth', () => ({ useAuth: mocks.useAuth }))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signInAnonymously: mocks.signInAnonymously } } }))

beforeEach(() => {
  mocks.useAuth.mockReturnValue({ session: null, loading: false })
  mocks.signInAnonymously.mockReset().mockReturnValue(new Promise(() => {}))
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>overview</p>} />
      </Routes>
    </MemoryRouter>,
  )

describe('LoginPage', () => {
  it('says plainly that this is a demo, not a real bank', () => {
    renderPage()
    expect(screen.getByText('Demo project — not a real bank')).toBeInTheDocument()
  })

  it('starts an anonymous demo session and shows progress', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Explore the demo' }))
    expect(mocks.signInAnonymously).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Setting up your demo…' })).toHaveAttribute('aria-busy', 'true')
  })

  it('explains a failed start and lets you try again', async () => {
    mocks.signInAnonymously.mockResolvedValue({ error: new Error('rate limited') })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Explore the demo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't start the demo. Try again in a few seconds.")
    expect(screen.getByRole('button', { name: 'Explore the demo' })).toBeEnabled()
  })

  it('sends signed-in visitors straight to their overview', () => {
    mocks.useAuth.mockReturnValue({ session: { user: { id: 'u' } }, loading: false })
    renderPage()
    expect(screen.getByText('overview')).toBeInTheDocument()
  })
})

describe('LoginPage source link', () => {
  it('links to the repository, opening safely in a new tab', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /View source on GitHub/ })
    expect(link).toHaveAttribute('href', 'https://github.com/zSamir015/obsidian-bank')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
