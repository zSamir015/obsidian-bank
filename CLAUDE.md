# Obsidian Bank

Portfolio demo of a personal banking app. **Not a real bank**: no real money, cards or accounts.

## Permanent rules

- **Money is always integer cents** typed as `Cents` (`src/types/bank.ts`). Never use floats for amounts. Build values with `toCents` / `parseCents` (string parsing, no float multiplication) or `asCents` (integers from the DB); display with `formatMoney` (`src/lib/money.ts`). The database stores `bigint` cents.
- **Amounts are positive.** Direction comes from `type: 'debit' | 'credit'`, never from the sign.
- **Domain types are `readonly`.** State is updated immutably (new objects/arrays, never mutation).
- **Cards: store and handle only `last4`.** Never the full card number (PAN) or the CVV, not even in mocks or tests.
- **`transfer` is not income or spending.** It is excluded from budgets and from income/spending analytics.
- **Respect `prefers-reduced-motion`** in every animation (Framer Motion, CSS, Three.js).
- **Server state via React Query, UI state via Zustand.** Never mirror Supabase data in Zustand.
- **Supabase rows go through `src/lib/mappers.ts`**, which validate them into domain types.
- **Database changes are forward-only migrations** in `supabase/migrations/` (never edit an applied one), each covered by PGlite tests in `supabase/tests/`. SECURITY DEFINER functions pin `search_path = ''`; client-callable ones check `auth.uid()`, internal ones are revoked from `anon`/`authenticated`.
- **Never apply a migration to production on your own.** Migration 002 ships together with the new frontend, coordinated with the owner. Then run `npm run db:types`.
- **Every phase ends with `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` passing.**
- **Commits and PRs carry no AI attribution** (no `Co-Authored-By` trailers, no "Generated with" lines).

## Palette

| Token           | Value     | Use                                                                                                                                  |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `bg`            | `#050505` | Page background                                                                                                                      |
| `surface`       | `#121212` | Cards, panels                                                                                                                        |
| `surface-2`     | `#18181B` | Raised surfaces, inputs                                                                                                              |
| `accent`        | `#FF2A3B` | Primary actions, highlights                                                                                                          |
| `accent-strong` | `#E50914` | Pressed/active accent                                                                                                                |
| `text`          | `#FFFFFF` | Primary text                                                                                                                         |
| `danger`        | `#FF9F1C` | Errors and destructive states. Amber so it never reads as the red accent; **always paired with an icon and text**, never color alone |

## Stack

Vite · React · TypeScript (strict) · Tailwind CSS v4 (`@tailwindcss/vite`) · React Router · TanStack React Query · Zustand (UI state only) · Zod + React Hook Form · Framer Motion · React Three Fiber + Drei (lazy-loaded, never in the initial bundle) · Recharts · Lucide · Supabase (Postgres, Auth, RLS, RPC) · Vitest + Testing Library + PGlite · ESLint (typescript-eslint, react-hooks) · Prettier.

## Commands

- `npm run dev` / `build` / `preview`
- `npm run lint` / `typecheck` / `test` / `format`
- `npm run notices` — regenerate `THIRD_PARTY_NOTICES.md` after dependency changes
- `npm run db:types` — regenerate `src/types/database.ts` from production (after `supabase login`)
