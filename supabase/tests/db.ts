// In-memory Postgres (PGlite) that mimics the parts of Supabase the migrations rely on:
// the auth schema, auth.uid(), the anon/authenticated roles and Supabase's default grants.
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite, type Transaction } from '@electric-sql/pglite'

const migrationsDir = new URL('../migrations/', import.meta.url)

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    is_anonymous boolean not null default false,
    created_at timestamptz not null default now(),
    last_sign_in_at timestamptz
  );
  create table auth.sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`

// Migrations PGlite cannot run, with the reason. They are checked statically in their own tests.
export const PGLITE_UNSUPPORTED: Record<string, string> = {
  '004_schedule_anonymous_cleanup.sql': 'pg_cron is not available in PGlite',
}

export const allMigrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

export const migrations = allMigrations.filter((f) => !(f in PGLITE_UNSUPPORTED))

export const readMigration = (file: string) => readFileSync(new URL(file, migrationsDir), 'utf8')

export async function createDb() {
  const db = new PGlite()
  await db.exec(SUPABASE_STUB)
  return db
}

const applied = new WeakMap<PGlite, number>()

/** Applies pending migrations up to (not including) index `upTo`, like `supabase db push` would. */
export async function migrate(db: PGlite, upTo = migrations.length) {
  const from = applied.get(db) ?? 0
  for (const file of migrations.slice(from, upTo)) {
    await db.exec(readMigration(file))
  }
  applied.set(db, Math.max(from, upTo))
}

export async function createUser(db: PGlite) {
  const { rows } = await db.query<{ id: string }>('insert into auth.users (id) values (gen_random_uuid()) returning id')
  return rows[0]!.id
}

/** Runs fn as the API would for a signed-in user (role authenticated, RLS enforced). Always rolls back. */
export async function asUser<T>(db: PGlite, userId: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  let result: T
  try {
    await db.transaction(async (tx) => {
      await tx.exec(`set local role ${userId ? 'authenticated' : 'anon'}`)
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ''])
      result = await fn(tx)
      throw new Rollback()
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
  return result!
}

class Rollback extends Error {}
