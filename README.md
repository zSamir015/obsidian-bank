# Obsidian Bank

> **Demo project — not a real bank.** No real money, accounts or cards are involved. Built as a portfolio piece.

Personal banking app built with React 19, TypeScript and Supabase: accounts, cards, transactions, budgets and atomic server-side transfers. It is being rebuilt phase by phase; see [`docs/specs/`](docs/specs/).

Live demo: https://zsamir015.github.io/obsidian-bank/

## Stack

Vite · React · TypeScript (strict) · Tailwind CSS v4 · React Router · TanStack React Query · Zod + React Hook Form · Recharts · Supabase (Postgres, Auth, Row Level Security, RPC) · Vitest + Testing Library + PGlite · ESLint · Prettier.

## Getting started

```sh
npm install
cp .env.example .env   # add your Supabase project URL and anon key
npm run dev
```

Apply the SQL in `supabase/migrations/` to your Supabase project, in order.

## Scripts

| Script              | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the dev server                               |
| `npm run build`     | Typecheck and build for production                 |
| `npm run lint`      | ESLint                                             |
| `npm run typecheck` | TypeScript project build check                     |
| `npm test`          | Unit tests and database migration tests            |
| `npm run format`    | Prettier                                           |
| `npm run notices`   | Regenerate `THIRD_PARTY_NOTICES.md`                |
| `npm run db:types`  | Regenerate Supabase types (needs `supabase login`) |

## Implementation notes

- **Money** is stored and handled as integer cents. Amounts are always positive; a transaction's `type` (`debit` / `credit`) gives its direction.
- **Simplified balances.** An account's balance is the sum of all its transactions, including `pending` and `flagged` ones. A real bank would separate the posted balance from the available balance and hold pending charges apart; this demo keeps a single balance.
- **Migration tests run on PGlite.** `supabase/tests/` applies every migration to [PGlite](https://pglite.dev/) (Postgres compiled to WebAssembly, in memory) with a small stub of Supabase's `auth` schema and API roles. That checks constraints, Row Level Security, the transfer function and the demo data without Docker or a live database. It is close to Supabase but not identical, so migrations are still reviewed before being applied to production.
- **Cards** only ever store the last four digits; never the full card number or CVV.

## License

[MIT](LICENSE) © 2026 Samir Lorenzo. Third-party packages and fonts keep their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) (regenerate with `npm run notices`).
