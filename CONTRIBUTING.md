# Contributing

These are the rules the codebase follows. Most of them exist because the app handles money, even if it is pretend money, so read them before changing anything in `src/lib`, `src/types` or `supabase/`.

## Workflow

- One issue per branch and per pull request. Branch names follow the change type, for example `feat/issue-21-csv-export` or `ci/pages-node-lts`.
- Before opening a pull request, run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. If the change touches a user journey, also run `npm run test:e2e`.
- `main` only accepts pull requests with a linear history (rebase or squash) once CI is green on a branch that is up to date with `main`.
- Keep commits small and focused, and stage them with explicit paths (`git commit -- <paths>`) so nothing unrelated slips in.

## Money and domain types

- Money is always integer cents, typed as `Cents` (`src/types/bank.ts`). Never use floating point for amounts. Build values with `toCents` or `parseCents` (string parsing, no float multiplication) or `asCents` (integers from the database), and display them with `formatMoney` (`src/lib/money.ts`). The database stores `bigint` cents.
- Amounts are positive. The direction comes from `type: 'debit' | 'credit'`, never from the sign.
- Domain types are `readonly`, and state is updated immutably.
- Cards store and handle only `last4`. Never the full card number or the CVV, not even in mocks or tests.
- `transfer` is not income or spending. It is excluded from budgets and from income and spending totals.
- Rows from Supabase go through `src/lib/mappers.ts`, which validates them into domain types.

## Frontend

- Server state lives in TanStack Query. Local UI state stays in components; do not copy server data into other stores.
- Every animation respects `prefers-reduced-motion`, whether it is CSS or three.js.
- Routes are lazy-loaded, and the initial JavaScript must stay under 180 kB gzip (`npm run check:initial-bundle`). three.js and its helpers must never be imported statically from code that loads on first paint.

## Database

- Schema changes are forward-only migrations in `supabase/migrations/`. Never edit a migration that has been applied; add a new one.
- Every migration has PGlite tests in `supabase/tests/`, covering policies, grants and functions as well as the happy path.
- `SECURITY DEFINER` functions pin `search_path = ''`. Functions callable from the client check `auth.uid()`; internal ones are revoked from `anon` and `authenticated`.
- New tables and views need explicit grants. Supabase's default privileges give every API role full access to new relations, so revoke first and then grant only what is needed.
- Migrations are applied to production by hand, after a `supabase db push --dry-run`, and only before the frontend that needs them is merged. Run `npm run db:types` afterwards.

## Visual system

The interface is editorial and monochrome: content first, few boxes, generous spacing.

### Palette

| Token           | Value     | Use                                                                                                      |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `bg`            | `#050505` | Page background                                                                                          |
| `sunken`        | `#0B0B0C` | Recessed surface for lists (activity, transactions)                                                      |
| `surface`       | `#121212` | Cards                                                                                                    |
| `surface-2`     | `#18181B` | Inputs, hover states                                                                                     |
| `hairline`      | `#27272A` | 1px borders and dividers                                                                                 |
| `text`          | `#FFFFFF` | Primary text, primary buttons                                                                            |
| `muted`         | `#A1A1AA` | Section titles, labels, secondary text, cents                                                            |
| `accent`        | `#FF2A3B` | The single red element of a screen, such as the hero glow. Never behind white text (3.6:1 fails WCAG AA) |
| `accent-strong` | `#E50914` | Only if red has to carry white text (4.6:1). Avoid by default                                            |
| `danger`        | `#FF9F1C` | Errors only, always with an icon and text, never colour alone                                            |

### Rules

- Red appears in at most one element per screen. There is no green: income shows a `+` in white. Amber is reserved for errors.
- Headings use Geist at weight 500, never heavier, with tracking of about `-0.024em` for display sizes and `-0.01em` for 24 to 40px. Section titles are muted, not white.
- Labels are 12px, uppercase, with `+0.015em` tracking.
- Amounts use the proportional sans with `tabular-nums`, never monospace for large figures. Cents are smaller and muted. Debits show `−`, credits `+`.
- Geist Mono is only for last four digits, ids and routing numbers.
- Buttons, inputs and tags are pills. Cards have a radius of about 22px, a hairline border and no shadow.
- The primary button is a white pill with `#050505` text; the secondary button is a pill with a hairline border.
- The total balance is a large hero on the page background, not inside a card. Lists sit on the `sunken` surface, with about 80px between sections on desktop.
- Fonts are self-hosted, latin subset, at most two weights per family. Only the text and amount faces are preloaded.

## Commands

- `npm run dev`, `npm run build`, `npm run preview`
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run format`
- `npm run notices` regenerates `THIRD_PARTY_NOTICES.md` after dependency changes.
- `npm run db:types` regenerates `src/types/database.ts` from the linked project (after `supabase login`).
