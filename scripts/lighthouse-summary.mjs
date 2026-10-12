// Prints the median LCP, TBT and CLS of each Lighthouse URL, and adds them to the job summary
// on GitHub Actions. The assertions only print values when they fail; this shows the margin
// on every run (see #57).
import { appendFileSync, readdirSync, readFileSync } from 'node:fs'

const dir = '.lighthouseci'
const runs = new Map()
for (const file of readdirSync(dir).filter((name) => /^lhr-.*\.json$/.test(name))) {
  const report = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'))
  const path = new URL(report.finalDisplayedUrl).pathname
  const audit = (id) => report.audits[id].numericValue
  runs.set(path, [
    ...(runs.get(path) ?? []),
    {
      lcp: audit('largest-contentful-paint'),
      tbt: audit('total-blocking-time'),
      cls: audit('cumulative-layout-shift'),
    },
  ])
}

const median = (values) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)]
const rows = [...runs].map(([path, list]) => {
  const lcps = list.map((run) => Math.round(run.lcp))
  return `| ${path} | ${median(lcps)} ms | ${lcps.join(', ')} | ${Math.round(median(list.map((run) => run.tbt)))} ms | ${median(list.map((run) => run.cls)).toFixed(3)} |`
})
const table = ['| URL | LCP (median) | LCP (runs) | TBT | CLS |', '| --- | --- | --- | --- | --- |', ...rows].join('\n')
console.log(table)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Lighthouse\n\n${table}\n`)
