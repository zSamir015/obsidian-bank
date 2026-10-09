import { NavLink, Outlet } from 'react-router'
import { supabase } from '../lib/supabase'

const NAV = [
  { to: '/', label: 'Resumen', end: true },
  { to: '/movimientos', label: 'Movimientos' },
  { to: '/transferir', label: 'Transferir' },
  { to: '/presupuestos', label: 'Presupuestos' },
]

export function Layout() {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="sticky top-0 z-10 border-b border-obsidian-700 bg-obsidian-950/90 backdrop-blur md:h-dvh md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 md:px-5 md:py-6">
          <Logo />
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="text-sm text-zinc-400 hover:text-zinc-100 md:hidden"
          >
            Salir
          </button>
        </div>
        <nav aria-label="Principal" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                  isActive ? 'bg-obsidian-800 text-zinc-50' : 'text-zinc-400 hover:bg-obsidian-900 hover:text-zinc-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="absolute bottom-6 left-5 hidden text-sm text-zinc-500 hover:text-zinc-100 md:block"
        >
          Cerrar sesión
        </button>
      </aside>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <Outlet />
      </main>
    </div>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
        <path d="M12 2 20 8 17 21H7L4 8Z" fill="url(#sheen)" />
        <path d="M12 2 12 21M4 8l8 4 8-4" stroke="#07060b" strokeOpacity=".5" fill="none" />
        <defs>
          <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c4b5fd" />
            <stop offset="1" stopColor="#3b2a6b" />
          </linearGradient>
        </defs>
      </svg>
      Obsidian Bank
    </span>
  )
}
