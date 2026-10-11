# Obsidian Bank

> **Demo project — not a real bank.** No real money, accounts or cards are involved. Built as a portfolio piece.

Personal banking app built with React 19, TypeScript and Supabase: accounts, cards, transactions, budgets and atomic server-side transfers. It is being rebuilt phase by phase; see [`docs/specs/`](docs/specs/).

Live demo: https://zsamir015.github.io/obsidian-bank/

**How to use it:** [user guide](docs/USER_GUIDE.md), screen by screen, for non-technical readers. **What's next:** [roadmap](ROADMAP.md).

| Overview                                                                                                                         | Activity                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ![Overview: total balance hero, accounts, cards, spending against budgets and recent activity](docs/screenshots/overview.webp)   | ![Activity: transactions grouped by day with search and filters](docs/screenshots/activity.webp) |
| **Move money**                                                                                                                   | **Budgets**                                                                                      |
| ![Transfer form with a summary of balances after the transfer](docs/screenshots/transfer.webp)                                   | ![Budgets with spending against each monthly limit](docs/screenshots/budgets.webp)               |
| **Cards**                                                                                                                        |                                                                                                  |
| ![Cards: the 3D card on a stage, with the card picker, Show back and the freeze and limit controls](docs/screenshots/cards.webp) |                                                                                                  |

<sub>Screenshots at 1280px with local demo data.</sub>

## Stack

Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · React Router · TanStack React Query · Zod + React Hook Form · React Three Fiber + Drei (cards page only) · Lucide · Geist (self-hosted) · Supabase (Postgres, Auth, Row Level Security, RPC) · Vitest + Testing Library + PGlite · ESLint · Prettier.

## Getting started

```sh
npm install
cp .env.example .env   # add your Supabase project URL and anon key
npm run dev
```

Apply the SQL in `supabase/migrations/` to your Supabase project, in order.

## Scripts

| Script              | What it does                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `npm run dev`       | Start the dev server                                                                      |
| `npm run build`     | Typecheck and build for production                                                        |
| `npm run lint`      | ESLint                                                                                    |
| `npm run typecheck` | TypeScript project build check                                                            |
| `npm test`          | Unit tests and database migration tests                                                   |
| `npm run test:e2e`  | Playwright E2E and axe accessibility scans against production at desktop and mobile sizes |
| `npm run format`    | Prettier                                                                                  |
| `npm run notices`   | Regenerate `THIRD_PARTY_NOTICES.md`                                                       |
| `npm run db:types`  | Regenerate Supabase types (needs `supabase login`)                                        |

## Implementation notes

- **Money** is stored and handled as integer cents. Amounts are always positive; a transaction's `type` (`debit` / `credit`) gives its direction.
- **Available and ledger balances.** The ledger balance is the net of completed transactions; the available balance also subtracts pending and under-review (`flagged`) debits. Both come from the `account_balances` view, which runs with the caller's permissions so Row Level Security still applies. `transfer_funds` locks both accounts and then checks the available balance on the server.
- **Migration tests run on PGlite.** `supabase/tests/` applies every migration to [PGlite](https://pglite.dev/) (Postgres compiled to WebAssembly, in memory) with a small stub of Supabase's `auth` schema and API roles. That checks constraints, Row Level Security, the transfer function and the demo data without Docker or a live database. It is close to Supabase but not identical, so migrations are still reviewed before being applied to production.
- **Demo users are cleaned up automatically.** Each visit to the demo signs in anonymously and gets its own seeded data. A daily `pg_cron` job (04:17 UTC) deletes anonymous users with no activity for more than 7 days, together with their accounts, cards, transactions and budgets. Non-anonymous users are never touched. PGlite has no `pg_cron`, so the cleanup function is tested on its own and the scheduling migration is checked statically.
- **Performance budgets:** Lighthouse CI audits Login, Overview and Cards in its mobile profile on every pull request. JavaScript transfer must stay under 180 kB per audited screen, LCP under 2.5 s, CLS under 0.1 and TBT under 200 ms. The table reports the worst of three runs per screen:

  | Screen   | JavaScript transfer | LCP    | CLS   | TBT  |
  | -------- | ------------------- | ------ | ----- | ---- |
  | Login    | 142.8 kB            | 2.13 s | 0     | 0 ms |
  | Overview | 156.6 kB            | 2.43 s | 0.004 | 0 ms |
  | Cards    | 155.0 kB            | 2.43 s | 0     | 0 ms |

  Lighthouse runs against a production preview with a local mock backend and simulated mobile throttling. The build checks that the initial JavaScript bundle stays under 180 kB gzip and the lazy 3D card module is absent from the initial static import graph; the audited Login and Cards runs also confirm that the 3D module is not requested.

- **Cards** only ever store the last four digits; never the full card number or CVV.

## How the 3D card loads

`/cards` shows an interactive 3D card, but three.js never reaches the initial bundle:

1. **Route chunk.** `/cards` is a lazy route like every page; its chunk (~4 kB gzip) holds the page, the controls and the static card.
2. **Capability check.** On mount, `CardVisual` runs the 3D card only if the browser has WebGL and the user has not asked for reduced motion.
3. **3D chunk.** Only then does `React.lazy` request the 3D chunk: three.js, React Three Fiber, Drei, @use-gesture and maath, 273 kB gzip in the build output. While it downloads, the static CSS card is shown in its place, so the layout does not move.
4. **Fallbacks.** An error boundary switches to the static card if the chunk fails to load, and so does a lost WebGL context (`webglcontextlost`). The static card shows the same details: tier, last four digits, holder, expiry and frozen state.

The card is presented like a product on a studio set: drag it to turn it (free around the vertical axis, limited tilt) and on release it settles on the nearest face; "Show back / Show front" turns it with the keyboard too. At rest it floats and swings slowly, and stops after about 30 seconds without interaction. The entrance from edge-on plays once per session.

Inside the 3D card, `frameloop="demand"` draws frames only while something moves, and the frame loop stops entirely while the card is off screen or the tab is in the background. Drag input is applied in `useFrame` (no React re-render per pointer move), with critically damped easing from maath (no bounce). `dpr` is capped at 2, reflections come from Lightformers built in code (no HDR files), the contact shadow is baked once, and both faces are canvas textures drawn after the web fonts load. On touch screens a vertical swipe keeps scrolling; a horizontal drag turns the card. With reduced motion the static card is shown and changes face instantly. Freeze and limit controls are regular HTML, outside the canvas, which is marked decorative.

## License

[MIT](LICENSE) © 2026 Samir Lorenzo. Third-party packages and fonts keep their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) (regenerate with `npm run notices`).
