// GitHub Pages has no SPA fallback. Copying index.html to <route>.html makes Pages serve
// every known route with status 200 (it maps /activity to activity.html). 404.html stays
// a copy too, so unknown URLs still load the app's own "not found" page, with status 404.
// Keep ROUTES in sync with src/router/routes.tsx and src/router/legacyRedirects.tsx.
import { copyFileSync } from 'node:fs'

const ROUTES = ['login', 'activity', 'transfer', 'budgets', 'movimientos', 'transferir', 'presupuestos']

for (const file of [...ROUTES.map((r) => `${r}.html`), '404.html']) copyFileSync('dist/index.html', `dist/${file}`)
console.log(`Copied index.html to ${ROUTES.length} route files and 404.html`)
