const { readFileSync } = require('node:fs')
const { session } = require('./lighthouse-session.cjs')

module.exports = async (browser, { url }) => {
  const target = new URL(url)
  if (target.pathname.endsWith('/login')) return

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ??
    readFileSync('.env', 'utf8')
      .match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]
      ?.trim()
      .replace(/^['"]|['"]$/g, '')
  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL is required to seed the Lighthouse demo session.')
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
  const page = await browser.newPage()

  await page.goto(new URL('/obsidian-bank/auth/health', target.origin).href, { waitUntil: 'networkidle0' })
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify(session)])
  await page.close()
}
