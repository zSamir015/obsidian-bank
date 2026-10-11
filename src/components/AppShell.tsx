import { ArrowLeftRight, ChartPie, CircleHelp, CreditCard, LayoutGrid, LogOut, ReceiptText } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useI18n } from '@/i18n/useI18n'
import { supabase } from '@/lib/supabase'
import { LanguagePicker } from './LanguagePicker'
import { Logo } from './Logo'
import { NotificationsLink } from './NotificationsLink'

const NotificationsLinkLive = lazy(() => import('./NotificationsLinkLive'))

const NAV = [
  { to: '/', key: 'overview', icon: LayoutGrid, end: true },
  { to: '/activity', key: 'activity', icon: ReceiptText },
  { to: '/transfer', key: 'transfer', icon: ArrowLeftRight },
  { to: '/budgets', key: 'budgets', icon: ChartPie },
  { to: '/cards', key: 'cards', icon: CreditCard },
] as const

const userGuideUrl = 'https://github.com/zSamir015/obsidian-bank/blob/main/docs/USER_GUIDE.md'

// Active items stay monochrome: each screen spends its single red accent on its own content.
const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors ${
    isActive ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'
  }`

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${isActive ? 'text-text' : 'text-muted'}`

export function AppShell() {
  const { t } = useI18n()
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-text px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.nav.skipToContent}
      </a>

      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:border-r md:border-hairline md:px-4 md:py-7">
        <div className="px-4">
          <Logo />
        </div>
        <nav aria-label={t.nav.main} className="mt-10 flex flex-col gap-1">
          {NAV.map(({ to, key, icon: Icon, ...rest }) => (
            <NavLink key={to} to={to} className={itemClass} {...rest}>
              <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
              {t.nav[key]}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col items-start gap-1">
          <Suspense fallback={<NotificationsLink desktop />}>
            <NotificationsLinkLive desktop />
          </Suspense>
          <LanguagePicker className="px-4" />
          <HelpLink desktop />
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm whitespace-nowrap text-muted hover:text-text"
          >
            <LogOut aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
            {t.nav.signOut}
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between gap-2 px-5 pt-5 md:hidden">
        <Logo collapse />
        <div className="flex items-center">
          <Suspense fallback={<NotificationsLink />}>
            <NotificationsLinkLive />
          </Suspense>
          <LanguagePicker compact className="px-2.5" />
          <HelpLink />
          {/* Phones show the icon only, like Help; the label stays for screen readers. */}
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="inline-flex items-center gap-2 rounded-full px-2.5 py-2 text-sm whitespace-nowrap text-muted hover:text-text sm:px-3"
          >
            <LogOut aria-hidden="true" className="size-[17px] sm:hidden" strokeWidth={1.75} />
            <span className="sr-only sm:not-sr-only">{t.nav.signOut}</span>
          </button>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-5xl overflow-x-clip px-5 pt-10 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-12 md:pt-16 md:pb-24"
      >
        <Outlet />
      </main>

      <nav
        aria-label={t.nav.main}
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-hairline bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.map(({ to, key, icon: Icon, ...rest }) => (
          <NavLink key={to} to={to} className={tabClass} {...rest}>
            <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
            {t.nav[key]}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function HelpLink({ desktop = false }: { readonly desktop?: boolean }) {
  const { t } = useI18n()
  return (
    <a
      href={userGuideUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.nav.helpLabel}
      className={`inline-flex items-center rounded-full text-sm whitespace-nowrap text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text ${
        desktop ? 'gap-3 px-4 py-2.5' : 'gap-2 px-2.5 py-2'
      }`}
    >
      <CircleHelp aria-hidden="true" className="size-[17px]" strokeWidth={1.75} />
      {/* The top bar on phones has room for the icon only; the link keeps its accessible name. */}
      <span className={desktop ? undefined : 'sr-only sm:not-sr-only'}>{t.nav.help}</span>
      <span className="sr-only">{t.app.opensInNewTab}</span>
    </a>
  )
}
