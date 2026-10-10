# Roadmap

Obsidian Bank is a portfolio demo, not a real bank. This roadmap shows what has shipped and what is proposed next. Proposed items are ideas, not commitments: each one is a GitHub issue labelled `proposal`, grouped into a [milestone](https://github.com/zSamir015/obsidian-bank/milestones).

| Version  | Theme                                  | Status                 |
| -------- | -------------------------------------- | ---------------------- |
| **v2.0** | Redesign, data foundation and 3D cards | Shipped (October 2026) |
| **v2.1** | Polish                                 | Proposed               |
| **v2.2** | Features                               | Proposed               |
| **v3.0** | Platform                               | Proposed               |

## v2.0: shipped

Released as [v2.0.0](https://github.com/zSamir015/obsidian-bank/releases/tag/v2.0.0) on 9 October 2026, with follow-ups on the live demo since.

- **Redesign.** Editorial, monochrome interface in English; every route is a lazy chunk (179 kB of JavaScript on first load, gzip).
- **Data foundation.** Money as integer cents in USD; positive amounts with a debit/credit type; checking and vault accounts with APY; cards stored by last four digits only; transfers excluded from budgets and income/spending.
- **Security.** Row Level Security on every table; transfers, card freezes and limit changes run in server functions that check the signed-in user.
- **Anonymous demo sessions** with their own seeded data, deleted after 7 days of inactivity ([#3](https://github.com/zSamir015/obsidian-bank/issues/3)).
- **Cards.** `/cards` with freeze/unfreeze and limit changes, a 3D card that never reaches the initial bundle and a static fallback ([#6](https://github.com/zSamir015/obsidian-bank/issues/6)); obsidian material finish ([#11](https://github.com/zSamir015/obsidian-bank/issues/11)); product-presentation stage with drag to turn and a designed back ([#14](https://github.com/zSamir015/obsidian-bank/issues/14)).
- **Maintenance.** Class merging with `cn()` ([#4](https://github.com/zSamir015/obsidian-bank/issues/4)), current screenshots ([#5](https://github.com/zSamir015/obsidian-bank/issues/5)), CI on every pull request (lint, typecheck, tests, build) and a [user guide](docs/USER_GUIDE.md).

## v2.1: polish

### Login scroll story ([#15](https://github.com/zSamir015/obsidian-bank/issues/15))

- **Goal:** on desktop, the sign-in page tells the product's story as you scroll, with the 3D card.
- **Value:** visitors understand what the demo offers before they start it.
- **Done when:** the issue's three conditions hold (desktop only from 1024 px; the 3D chunk loads in idle time after first paint; "Explore the demo" stays visible and usable throughout), scroll is never hijacked, reduced motion gets a static version, and Lighthouse performance on the login page doesn't drop.

### Accessibility audit with axe in CI ([#17](https://github.com/zSamir015/obsidian-bank/issues/17))

- **Goal:** automated accessibility checks (axe-core) on every screen in CI.
- **Value:** keyboard and screen-reader users keep a working app; regressions are caught before they ship.
- **Done when:** axe runs on all screens at 1280 and 375 px with zero serious or critical violations, a new violation fails CI, and a manual keyboard and VoiceOver pass is recorded.

### Performance budget with Lighthouse CI ([#18](https://github.com/zSamir015/obsidian-bank/issues/18))

- **Goal:** a written performance budget enforced by Lighthouse CI.
- **Value:** the demo stays fast on mid-range phones and slow connections.
- **Done when:** Lighthouse CI runs on every pull request (mobile profile) against Login, Overview and Cards; budgets for initial JavaScript, LCP, CLS and TBT are written down; breaking one fails CI.

### End-to-end tests with Playwright in CI ([#19](https://github.com/zSamir015/obsidian-bank/issues/19))

- **Goal:** the main journeys tested end to end against the production build.
- **Value:** the flows people use are proven to work together, not only in isolation.
- **Done when:** sign-in, transfer, budget, card freeze/limit, card turn and reduced motion are covered; CI never touches production data; 10 consecutive runs pass without retries.

## v2.2: features

### Available vs ledger balance ([#20](https://github.com/zSamir015/obsidian-bank/issues/20))

- **Goal:** two balances per account, ledger (settled) and available (minus pending and under-review debits).
- **Value:** people see what they can spend now and why it differs from the settled balance.
- **Done when:** both are computed on the server with migration tests, shown on Overview and Move money, and transfers are checked against the available balance.

### Export transactions to CSV ([#21](https://github.com/zSamir015/obsidian-bank/issues/21))

- **Goal:** download the filtered Activity list as a CSV file.
- **Value:** history goes straight into a spreadsheet.
- **Done when:** the export matches the filters, uses documented columns, escapes values (including protection against spreadsheet formulas) and is covered by tests.

### External transfers with validated ABA routing numbers ([#22](https://github.com/zSamir015/obsidian-bank/issues/22))

- **Goal:** send money to a fictional external US account by routing and account number.
- **Value:** covers the most common real transfer, with mistakes caught before sending.
- **Done when:** routing numbers pass the ABA checksum on client and server, recipient accounts are stored masked, the transfer is atomic and pending until settled (simulated), and no real payment network is ever contacted.

### Spanish version ([#23](https://github.com/zSamir015/obsidian-bank/issues/23))

- **Goal:** the whole app in Spanish as well as English.
- **Value:** Spanish speakers use the demo in their language.
- **Done when:** all copy comes from message catalogues, a language picker follows the browser by default, dates and numbers use the chosen locale (amounts stay in USD), and the user guide exists in Spanish.

## v3.0: platform

### Installable PWA ([#24](https://github.com/zSamir015/obsidian-bank/issues/24))

- **Goal:** install the demo on phones and desktops, with an offline shell.
- **Value:** it opens like an app and explains when it's offline instead of failing.
- **Done when:** it passes installability checks in Chrome and Safari, only the app shell is cached (never financial data), and updates don't leave stale chunks.

### Notifications for flagged activity ([#25](https://github.com/zSamir015/obsidian-bank/issues/25))

- **Goal:** tell the user when a transaction is marked Under review.
- **Value:** unusual payments are noticed straight away.
- **Done when:** the server creates an in-app notification for each flagged transaction, web push is opt-in only, notifications carry no sensitive data beyond merchant, amount and last four digits, and the flow is tested.
