# Phase 1 — Data foundation (design)

Approved 2026-10-09. Rebuild Obsidian Bank on top of the existing repo, phase by phase, keeping Supabase, auth, RLS and the server-side transfer. This phase changes data and rules only; the visual design is untouched.

## Decisions

- Currency USD. Domestic transfers will use ABA routing + account number (ABA validation lands in the transfers phase). IBAN/BIC out of scope.
- Amounts are always positive (`amount_cents > 0`) with `type: debit | credit`.
- Accounts: `savings` becomes `vault`, new `apy_bps`.
- New `cards` table (holder, last4, expiry, tier, limit, spent, is_frozen) with read-only RLS. Never store PAN or CVV.
- Categories: `corporate | travel | services | payroll`, plus `transfer` for internal movements. `transfer` is excluded from budgets and from spending/income analytics.
- Existing demo data is deleted and reseeded with `seed_demo_data(user_id)`, which `handle_new_user` also calls.
- `type` and `status` are NOT NULL after backfill.
- SECURITY DEFINER functions pin `search_path = ''`. Client-callable ones check `auth.uid()`; internal ones (`seed_demo_data`, `handle_new_user`) are not executable by `anon`/`authenticated`.
- `toCents` parses strings; it never multiplies floats.
- `danger` color `#FF9F1C`, always paired with an icon and text.
- ESLint (typescript-eslint, react-hooks) replaces oxlint; Prettier added.
- React Query for server state, Zustand for UI state only. Three.js lazy-loaded in its phase.
- UI and README move to English in the UI phase.

## Deliverables

1. `CLAUDE.md` with permanent rules, palette and stack.
2. `supabase/migrations/002_usd_vault_cards.sql` (001 stays untouched).
3. Migration tests on PGlite (`supabase/tests/`), run by Vitest and CI.
4. `src/types/database.ts` (generator format; regenerate after applying 002) and `src/types/bank.ts` (readonly domain types, branded `Cents`, row mappers).
5. `money.ts` (`toCents`, `formatMoney`), adapted analytics, queries and transfer schema; tests adapted and extended.
6. ESLint + Prettier, tsconfig `noImplicitOverride` and `@/` alias, `ci.yml`.
7. Minimal UI changes so the app compiles against the new model.

## Rollout

Migration 002 is **not** applied to production until the new frontend ships, and then both go out together with the user. Types are regenerated from production right after.

## Acceptance

`npm run lint`, `typecheck`, `test` and `build` pass. No commit.
