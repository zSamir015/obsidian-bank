# Security

Obsidian Bank is a portfolio demo: no real money, accounts or cards. Its data model and server functions are still built as if they were real, and reports are welcome.

## Reporting a vulnerability

Use GitHub's [private vulnerability reporting](https://github.com/zSamir015/obsidian-bank/security/advisories/new) for this repository. Please don't open a public issue. I'll reply within a week.

In scope: anything that lets one demo session read or change another session's data, run a server function without being signed in, bypass a limit enforced in the database, or put more than merchant, amount and last four digits in a notification.

## How the app is protected

The README's [Security](README.md#security) section describes the model: Row Level Security on every table, writes only through `SECURITY DEFINER` functions that check the signed-in user, and limits enforced in the database. Migrations and policies are public on purpose; no secret lives in this repository.

## Dependencies

Dependabot alerts and security updates are on. `npm audit --omit=dev` (what ships to the browser) reports no known vulnerabilities. Development tooling has known advisories with no fixed release yet (`extract-zip` and `sprintf-js`, reached through Lighthouse CI and Puppeteer); they only run in CI against a local build.
