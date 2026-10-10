import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import lighthouseSession from './lighthouse-session.cjs'

const { cardId, checkingId, createdAt, session, userId, vaultId } = lighthouseSession

const fixtures = {
  '/rest/v1/accounts': [
    {
      id: checkingId,
      user_id: userId,
      name: 'Everyday Checking',
      kind: 'checking',
      balance_cents: 1264055,
      currency: 'USD',
      apy_bps: 0,
      created_at: createdAt,
    },
    {
      id: vaultId,
      user_id: userId,
      name: 'Obsidian Vault',
      kind: 'vault',
      balance_cents: 3557252,
      currency: 'USD',
      apy_bps: 425,
      created_at: createdAt,
    },
  ],
  '/rest/v1/cards': [
    {
      id: cardId,
      user_id: userId,
      account_id: checkingId,
      card_holder: 'OBSIDIAN MEMBER',
      last4: '4821',
      expiry: '10/29',
      tier: 'black',
      limit_cents: 5000000,
      spent_cents: 1284750,
      is_frozen: false,
      created_at: createdAt,
    },
  ],
  '/rest/v1/transactions': [
    {
      id: '00000000-0000-4000-8000-000000000001',
      user_id: userId,
      account_id: checkingId,
      amount_cents: 8940,
      type: 'debit',
      category: 'travel',
      description: 'Uber',
      status: 'pending',
      transfer_id: null,
      created_at: createdAt,
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      user_id: userId,
      account_id: checkingId,
      amount_cents: 412500,
      type: 'credit',
      category: 'payroll',
      description: 'Payroll — Obsidian Labs Inc.',
      status: 'completed',
      transfer_id: null,
      created_at: createdAt,
    },
  ],
  '/rest/v1/budgets': [
    { id: '00000000-0000-4000-8000-0000000000b1', user_id: userId, category: 'travel', limit_cents: 120000 },
  ],
}

const backend = createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader(
    'Access-Control-Allow-Headers',
    request.headers['access-control-request-headers'] ?? 'apikey, authorization, content-type, x-client-info',
  )
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

  if (request.method === 'OPTIONS') {
    response.writeHead(204).end()
    return
  }

  const path = new URL(request.url, 'http://127.0.0.1').pathname
  let status = 200
  let body

  if (path === '/health') {
    body = { ok: true }
  } else if (path === '/auth/v1/signup' && request.method === 'POST') {
    body = session
  } else if (path.startsWith('/rest/v1/') && fixtures[path] && request.method === 'GET') {
    body = fixtures[path]
  } else {
    status = 404
    body = { message: `Unexpected Lighthouse mock request: ${request.method} ${path}` }
  }

  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
})

await new Promise((resolve, reject) => {
  backend.once('error', reject)
  backend.listen(54321, '127.0.0.1', resolve)
})

const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1'], {
  stdio: 'inherit',
})
let shuttingDown = false

async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  preview.kill('SIGTERM')
  await new Promise((resolve) => backend.close(resolve))
}

process.once('SIGINT', () => void shutdown())
process.once('SIGTERM', () => void shutdown())
preview.once('exit', async (code) => {
  await shutdown()
  process.exitCode = code ?? 1
})

const deadline = Date.now() + 30_000
while (Date.now() < deadline) {
  try {
    const [api, app] = await Promise.all([
      fetch('http://127.0.0.1:54321/health'),
      fetch('http://127.0.0.1:4173/obsidian-bank/login'),
    ])
    if (api.ok && app.ok) {
      console.log('Lighthouse servers ready')
      break
    }
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}

if (Date.now() >= deadline) {
  await shutdown()
  throw new Error('Timed out starting the Lighthouse preview servers.')
}
