# Obsidian Bank

[![CI](https://github.com/zSamir015/obsidian-bank/actions/workflows/ci.yml/badge.svg)](https://github.com/zSamir015/obsidian-bank/actions/workflows/ci.yml)
[![Deploy Pages](https://github.com/zSamir015/obsidian-bank/actions/workflows/pages.yml/badge.svg)](https://github.com/zSamir015/obsidian-bank/actions/workflows/pages.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Obsidian Bank is a personal banking web app built as a portfolio project. It is not a real bank: no real money, accounts or cards are involved, and it never talks to a payment network.

It has checking and savings accounts, available and ledger balances, transfers between your own accounts, an activity feed with filters and CSV export, monthly budgets, and cards that can be frozen or have their limit changed. Every visitor gets an anonymous session with three months of generated activity, so the demo works without signing up.

Live demo: https://zsamir015.github.io/obsidian-bank/
User guide for non-technical readers: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
Roadmap: [ROADMAP.md](ROADMAP.md)

| Overview                                                                                                                         | Activity                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ![Overview: total balance hero, accounts, cards, spending against budgets and recent activity](docs/screenshots/overview.webp)   | ![Activity: transactions grouped by day with search and filters](docs/screenshots/activity.webp) |
| **Move money**                                                                                                                   | **Budgets**                                                                                      |
| ![Transfer form with a summary of balances after the transfer](docs/screenshots/transfer.webp)                                   | ![Budgets with spending against each monthly limit](docs/screenshots/budgets.webp)               |
| **Cards**                                                                                                                        |                                                                                                  |
| ![Cards: the 3D card on a stage, with the card picker, Show back and the freeze and limit controls](docs/screenshots/cards.webp) |                                                                                                  |

<sub>Screenshots at 1280px with local demo data.</sub>

## Contents

- [How it works](#how-it-works)
- [Data model](#data-model)
- [Security](#security)
- [Frontend](#frontend)
- [How the 3D card loads](#how-the-3d-card-loads)
- [Testing](#testing)
- [CI and deployment](#ci-and-deployment)
- [Running it locally](#running-it-locally)
- [Project layout](#project-layout)
- [Design decisions and trade-offs](#design-decisions-and-trade-offs)
- [License](#license)

## How it works

The frontend is a single-page React app served as static files from GitHub Pages. All data lives in a Supabase project (Postgres with Auth and PostgREST in front of it).

```
Browser: React SPA on GitHub Pages
  React Router            one lazy-loaded chunk per route
  TanStack Query          server state, refetched after each mutation
  Zod + React Hook Form   form validation in the browser
  auth-js, postgrest-js   the two Supabase clients the app actually needs

Supabase
  Auth                    anonymous sign-in, one user per visitor
  PostgREST               reads, filtered by Row Level Security
  Postgres functions      every change to money or cards
  pg_cron                 daily cleanup of inactive demo users
```

A visit goes like this:

1. "Explore the demo" calls Supabase's anonymous sign-in. A database trigger on the new user (`handle_new_user`) runs `seed_demo_data`, which creates a checking account, a savings vault, about 50 transactions over three months, two cards and three budgets.
2. Pages read their data through PostgREST. Row Level Security limits every query to rows where `user_id = auth.uid()`, so a user can only ever see their own data.
3. Anything that changes money or cards is a call to a Postgres function (`transfer_funds`, `freeze_card`, `update_card_limit`). Each one checks the caller, validates its arguments and does the whole change in one transaction. After it returns, TanStack Query invalidates the affected queries so every screen shows the new state.
4. A `pg_cron` job runs every day at 04:17 UTC and deletes anonymous users that have been inactive for more than 7 days. Their accounts, cards, transactions and budgets go with them through `ON DELETE CASCADE`.

## Data model

| Table / view       | Purpose                                                                                     | Who can write                                  |
| ------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `accounts`         | Checking and vault accounts, with an APY in basis points for vaults                         | Only server functions                          |
| `transactions`     | Positive amount in cents, `type` (`debit`/`credit`), category, status, optional transfer id | Only server functions                          |
| `cards`            | Tier, last four digits, expiry, credit limit, amount spent, frozen flag                     | Only server functions                          |
| `budgets`          | Monthly limit per spending category                                                         | The owner, through an owner-only RLS policy    |
| `account_balances` | View with the ledger and available balance of each account                                  | Read-only; `SELECT` granted to signed-in users |

A few rules hold everywhere:

- Money is stored as `bigint` cents and handled in TypeScript as a branded `Cents` integer type. Amounts are always positive and the direction comes from `type`, so the sign never has to be trusted or inferred.
- The ledger balance is the net of completed transactions. The available balance is the ledger minus pending and under-review (`flagged`) debits, which is what a transfer is allowed to spend.
- Transfers between your own accounts use the `transfer` category. They are left out of budgets and out of income and spending totals, since moving money between your own accounts is neither.
- Cards only ever store the last four digits. There is no full card number or CVV anywhere, including fixtures and tests.

## Security

Row Level Security is enabled on every table. The API roles (`anon` and `authenticated`) can read their own accounts, transactions and cards but have no `INSERT` or `UPDATE` grant on them, so the only way to change a balance is through a server function.

The server functions follow the same pattern:

- They are `SECURITY DEFINER` with `search_path` pinned to an empty string, so a function cannot be tricked into resolving a table or operator from another schema.
- They start by reading `auth.uid()` and refuse to run without it. Internal helpers such as `seed_demo_data` are not executable by the API roles at all.
- `transfer_funds` locks both accounts with `SELECT ... FOR UPDATE` in a fixed order (by id), then checks the available balance. Two concurrent transfers from the same account are serialised, and neither can spend money the other has already taken.
- Card functions report `card_not_found` both for a card that doesn't exist and for a card owned by someone else, so they never reveal whether an id is valid.
- Errors are short codes (`insufficient_funds`, `limit_below_spent` and so on). The frontend maps them to messages in `src/lib/errors.ts` and never shows raw database errors.

On the client, every row coming from the database goes through the mappers in `src/lib/mappers.ts`, which turn it into a read-only domain type and throw on anything unexpected, such as an unknown status or a fractional amount of cents.

## Frontend

- Every route is lazy-loaded, and the initial JavaScript must stay under 180 kB gzip. `npm run check:initial-bundle` fails the build otherwise.
- The Supabase SDK is not used as a whole. The app imports `@supabase/auth-js` and `@supabase/postgrest-js` directly, which keeps storage, realtime and functions out of the bundle.
- Server data is only kept in TanStack Query. Forms use React Hook Form with Zod schemas, and the same limits are enforced again on the server.
- The interface is dark and mostly monochrome. Red marks at most one element per screen, and amber is reserved for errors, always with an icon and text so colour is never the only signal. Fonts (Geist and Geist Mono) are self-hosted.
- Every animation respects `prefers-reduced-motion`.

## How the 3D card loads

The cards page shows an interactive 3D card, but three.js never reaches the initial bundle.

1. `/cards` is a lazy route like every page. Its chunk holds the page, the controls and a static CSS version of the card.
2. When the page mounts, `CardVisual` checks whether the browser has WebGL and whether the user has asked for reduced motion. If either check fails, the static card stays.
3. Otherwise `React.lazy` requests the 3D chunk (three.js, React Three Fiber, Drei, @use-gesture and maath). The static card is shown while it downloads, in the same space, so nothing moves.
4. An error boundary switches back to the static card if the chunk fails to load, and so does a lost WebGL context. The static card shows the same tier, last four digits, holder, expiry and frozen state.

The card is presented like a product on a studio set. You can drag it to turn it (freely around the vertical axis, with limited tilt), and on release it settles on the nearest face. "Show back" and "Show front" do the same from the keyboard. At rest it floats and swings slowly and stops after about 30 seconds without interaction.

Rendering is kept cheap. The canvas uses `frameloop="demand"`, so frames are only drawn while something moves, and the loop stops completely when the card is off screen or the tab is hidden. Drag input is applied inside `useFrame` rather than through React state, so moving the pointer does not re-render components. Device pixel ratio is capped at 2, reflections come from light formers built in code rather than HDR files, the contact shadow is baked once, and both faces are canvas textures drawn after the web fonts have loaded.

On touch screens a vertical swipe keeps scrolling the page and a horizontal drag turns the card. Freeze and limit controls are regular HTML outside the canvas, and the canvas itself is marked as decorative for screen readers.

On desktop, the sign-in page reuses the same card in a scroll story. The 3D chunk is requested in idle time after the first paint, and "Explore the demo" stays usable the whole time.

## Testing

| Layer              | Tools                          | What it covers                                                                                                                              |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit and component | Vitest, Testing Library, jsdom | Money parsing and formatting, dates, mappers, analytics, CSV export, query hooks, and page states such as loading, errors and empty results |
| Database           | Vitest, PGlite                 | Every migration applied in order, then RLS isolation between users, grants, constraints and server functions                                |
| End to end         | Playwright                     | Sign-in, transfers, budgets, cards, reduced motion and CSV download, run against the production build                                       |
| Accessibility      | axe-core inside Playwright     | No serious or critical violations on the main screens at 1280px and 375px                                                                   |
| Performance        | Lighthouse CI                  | Login, Overview and Cards in the mobile profile                                                                                             |

The database tests use [PGlite](https://pglite.dev/), Postgres compiled to WebAssembly and run in memory. `supabase/tests/db.ts` creates a small stub of Supabase's `auth` schema, the `anon` and `authenticated` roles and Supabase's default privileges, then applies the migrations the same way `supabase db push` would. That makes it possible to test policies, grants and functions as a real signed-in user without Docker or a live database. PGlite has no `pg_cron`, so the scheduling migration is checked statically and the cleanup function is tested on its own.

End-to-end tests never touch the real backend. `e2e/support/demoBackend.ts` intercepts every Supabase request and answers from an in-memory fixture, and any request it doesn't expect fails the test. In CI the journeys run 10 times in a row without retries, to catch flaky tests early.

The performance budget is checked by Lighthouse CI on every pull request, against a production preview with a local mock backend and simulated mobile throttling. Breaking any of these fails the run:

| Metric                   | Budget |
| ------------------------ | ------ |
| JavaScript transferred   | 180 kB |
| Largest Contentful Paint | 2.5 s  |
| Cumulative Layout Shift  | 0.1    |
| Total Blocking Time      | 200 ms |

The Login and Cards runs also confirm that the 3D module is not requested.

## CI and deployment

The `CI` workflow runs on every pull request and every push to `main`, with three jobs:

- `check`: lint, typecheck, unit, component and database tests, and a production build.
- `e2e`: the Playwright journeys (10 repetitions) and the axe scans.
- `performance`: the initial-bundle check and Lighthouse CI.

`main` is protected: changes arrive through pull requests, the history stays linear, and `check` must pass on a branch that is up to date with `main`.

Merging to `main` triggers `Deploy Pages`. It runs the tests, builds with the production Supabase URL and anon key from repository secrets, and copies `index.html` to one file per route (`scripts/pages-routes.mjs`), because GitHub Pages has no single-page-app fallback.

Database migrations are not applied by CI. They are forward-only (an applied file is never edited), and each one is checked with a `supabase db push --dry-run` and applied to production by hand, before the frontend that depends on it is merged.

## Running it locally

You need Node 24 (the current LTS, which CI also uses) and a Supabase project.

```sh
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Apply the migrations in `supabase/migrations/` to your project in order, for example with `supabase link` followed by `supabase db push`. Anonymous sign-ins must be enabled in the project's Auth settings.

| Script                         | What it does                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `npm run dev`                  | Start the Vite dev server                                                                    |
| `npm run build`                | Typecheck and build for production                                                           |
| `npm run lint`                 | ESLint                                                                                       |
| `npm run typecheck`            | TypeScript project build check                                                               |
| `npm test`                     | Unit, component and database tests                                                           |
| `npm run test:e2e`             | Playwright journeys and axe scans against a production build with a mocked backend           |
| `npm run check:initial-bundle` | Fails if the initial JavaScript exceeds 180 kB gzip or statically imports the 3D card module |
| `npm run lhci`                 | Lighthouse CI against a production preview with a local mock backend                         |
| `npm run format`               | Prettier                                                                                     |
| `npm run notices`              | Regenerate `THIRD_PARTY_NOTICES.md`                                                          |
| `npm run db:types`             | Regenerate `src/types/database.ts` from the linked Supabase project (needs `supabase login`) |

## Project layout

```
src/
  auth/              session context and the protected route
  components/        app shell, transaction row and the small UI kit in ui/
  hooks/             TanStack Query hooks, one file per resource
  lib/               money, dates, mappers, analytics, CSV export, error messages
  pages/             one folder per route, each with its tests
  router/            route table and legacy redirects
  types/             domain types and generated database types
  test/              shared fixtures and test setup
supabase/
  migrations/        forward-only SQL migrations, numbered
  tests/             PGlite tests, one file per migration
e2e/                 Playwright specs and the mocked backend
scripts/             bundle check, Lighthouse helpers, Pages routes, notices
docs/                user guide, screenshots and design notes
```

## Design decisions and trade-offs

- **Writes go through Postgres functions instead of client-side updates.** It keeps every invariant (no overdrafts, no negative limits, transfers always balanced) in one place that the client cannot bypass. The cost is that business rules live in SQL, which is why every migration has tests.
- **Balances are computed from transactions** in the `account_balances` view, rather than kept in a column that has to stay in sync. For a demo with a few hundred rows per user this is fast, and it removes a whole class of drift bugs.
- **Anonymous sessions instead of sign-up.** Visitors can try the app in one click, and the daily cleanup keeps the database small. The trade-off is that a session is tied to one browser.
- **A mocked backend for end-to-end tests.** It makes them fast, deterministic and safe to run on every pull request. Database behaviour is covered separately by the PGlite tests, so the two together cover the full path.
- **Settlement is simulated.** Pending and under-review transactions come from the seed data, and nothing settles on its own yet. External transfers with simulated settlement are planned in [#22](https://github.com/zSamir015/obsidian-bank/issues/22).

## License

[MIT](LICENSE) © 2026 Samir Lorenzo. Third-party packages and fonts keep their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), regenerated with `npm run notices`.
