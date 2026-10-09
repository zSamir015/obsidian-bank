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

## Visual system

Editorial and monochrome: content first, few boxes, generous space. Inspired by the principles of Revolut's design system, adapted to a dark palette; never copy its identity or exact layouts.

### Palette

| Token           | Value     | Use                                                                                                                       |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `bg`            | `#050505` | Page background                                                                                                           |
| `sunken`        | `#0B0B0C` | Recessed surface for lists (activity, transactions)                                                                       |
| `surface`       | `#121212` | Cards                                                                                                                     |
| `surface-2`     | `#18181B` | Inputs, hover states                                                                                                      |
| `hairline`      | `#27272A` | 1px borders and dividers                                                                                                  |
| `text`          | `#FFFFFF` | Primary text, primary buttons                                                                                             |
| `muted`         | `#A1A1AA` | Section titles, labels, secondary text, cents                                                                             |
| `accent`        | `#FF2A3B` | The single red element of a screen (e.g. hero glow, active indicator). Never as a fill behind white text (3.6:1 fails AA) |
| `accent-strong` | `#E50914` | Only if red must carry white text (4.6:1). Avoid by default                                                               |
| `danger`        | `#FF9F1C` | Errors only, **always with an icon and text**, never color alone                                                          |

### Rules

- **Monochrome by default.** Red appears in **one element per screen** at most. No green: income shows a `+` in white. Amber is reserved for errors.
- **Headings:** Geist weight 500, never heavier. Negative tracking scaled to size: about `-0.024em` for display sizes, `-0.01em` for 24–40px. **Section titles are muted**, not white.
- **Labels:** 12px, uppercase, tracking `+0.015em` (e.g. `TOTAL BALANCE`).
- **Amounts:** proportional sans with `tabular-nums`; never monospace for large figures. Cents are smaller and muted. Debits show `−`, credits `+`.
- **Geist Mono** only for last4, IDs and routing numbers.
- **Shapes:** buttons, inputs and tags are pills (`9999px`). Cards have ~22px radius, a hairline border and no shadows. No chamfers or clip-paths.
- **Buttons:** primary is a white pill with `#050505` text; secondary is a pill with a hairline border.
- **Layout:** the total balance is a large editorial hero on the page background, not inside a card. Lists sit on the `sunken` surface. Fewer boxes, more space: ~80px between sections on desktop.
- **Fonts:** at most two weights per family, latin subset, self-hosted; preload only text and amount faces.

## Stack

Vite · React · TypeScript (strict) · Tailwind CSS v4 (`@tailwindcss/vite`) · React Router · TanStack React Query · Zustand (UI state only) · Zod + React Hook Form · Framer Motion · React Three Fiber + Drei (lazy-loaded, never in the initial bundle) · charts as plain CSS bars (no chart library) · Lucide · Supabase (Postgres, Auth, RLS, RPC) · Vitest + Testing Library + PGlite · ESLint (typescript-eslint, react-hooks) · Prettier.

## Commands

- `npm run dev` / `build` / `preview`
- `npm run lint` / `typecheck` / `test` / `format`
- `npm run notices` — regenerate `THIRD_PARTY_NOTICES.md` after dependency changes
- `npm run db:types` — regenerate `src/types/database.ts` from production (after `supabase login`)
