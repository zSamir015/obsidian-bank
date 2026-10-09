const shortDate = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })
const longDate = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatShortDate(iso: string): string {
  return shortDate.format(new Date(iso))
}

export function isInCurrentMonth(iso: string, now = new Date()): boolean {
  const date = new Date(iso)
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

/** "Today", "Yesterday", "Oct 7", or "Dec 31, 2025" outside the current year (local time). */
export function dayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (dayKey(date) === dayKey(now)) return 'Today'
  if (dayKey(date) === dayKey(yesterday)) return 'Yesterday'
  return date.getFullYear() === now.getFullYear() ? shortDate.format(date) : longDate.format(date)
}

export interface DayGroup<T> {
  readonly key: string
  readonly label: string
  readonly items: readonly T[]
}

/** Groups items (already sorted by date) into consecutive local days. */
export function groupByDay<T extends { readonly date: string }>(items: readonly T[], now = new Date()): DayGroup<T>[] {
  const groups: { key: string; label: string; items: T[] }[] = []
  for (const item of items) {
    const key = dayKey(new Date(item.date))
    const last = groups.at(-1)
    if (last?.key === key) last.items.push(item)
    else groups.push({ key, label: dayLabel(item.date, now), items: [item] })
  }
  return groups
}
