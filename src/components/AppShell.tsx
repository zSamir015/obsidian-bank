import { ArrowLeftRight, ChartPie, CreditCard, LayoutGrid, LogOut, ReceiptText } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { supabase } from '@/lib/supabase'
import { Logo } from './Logo'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/activity', label: 'Activity', icon: ReceiptText },
  { to: '/transfer', label: 'Transfer', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: ChartPie },
  { to: '/cards', label: 'Cards', icon: CreditCard },
] as const

// Active items stay monochrome: each screen spends its single red accent on its own content.
const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors ${
    isActive ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'
  }`

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${isActive ? 'text-text' : 'text-muted'}`

export function AppShell() {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-text px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:border-r md:border-hairline md:px-4 md:py-7">
        <div className="px-4">
          <Logo />
        </div>
        <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink key={to} to={to} className={itemClass} {...rest}>
              <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="mt-auto flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-muted hover:text-text"
        >
          <LogOut aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
          Sign out
        </button>
      </aside>

      <header className="flex items-center justify-between px-5 pt-5 md:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="rounded-full px-3 py-2 text-sm text-muted hover:text-text"
        >
          Sign out
        </button>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-5xl overflow-x-clip px-5 pt-10 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-12 md:pt-16 md:pb-24"
      >
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-hairline bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink key={to} to={to} className={tabClass} {...rest}>
            <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
