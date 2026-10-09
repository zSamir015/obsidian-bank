// GitHub Pages has no SPA fallback. Copying index.html to <route>.html makes Pages serve
// every known route with status 200 (it maps /activity to activity.html). 404.html stays
// a copy too, so unknown URLs still load the app's own "not found" page, with status 404.
// The route list is shared with the router; src/router/routes.test.ts fails if they drift.
import { copyFileSync, readFileSync } from 'node:fs'

const routes = JSON.parse(readFileSync(new URL('../src/router/static-routes.json', import.meta.url), 'utf8'))

for (const file of [...routes.map((r) => `${r}.html`), '404.html']) copyFileSync('dist/index.html', `dist/${file}`)
console.log(`Copied index.html to ${routes.length} route files and 404.html`)
