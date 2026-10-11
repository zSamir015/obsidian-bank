import { getMessages, intlLocale } from '@/i18n/runtime'

const formatters = new Map<string, Intl.DateTimeFormat>()
function dateFormat(withYear: boolean): Intl.DateTimeFormat {
  const key = `${intlLocale()}|${withYear}`
  let format = formatters.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(intlLocale(), {
      day: 'numeric',
      month: 'short',
      ...(withYear && { year: 'numeric' }),
    })
    formatters.set(key, format)
  }
  return format
}

export function formatShortDate(iso: string): string {
  return dateFormat(false).format(new Date(iso))
}

export function isInCurrentMonth(iso: string, now = new Date()): boolean {
  const date = new Date(iso)
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

/** "Today", "Yesterday", "Oct 7", or "Dec 31, 2025" outside the current year (local time), in the active language. */
export function dayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const t = getMessages()
  if (dayKey(date) === dayKey(now)) return t.dates.today
  if (dayKey(date) === dayKey(yesterday)) return t.dates.yesterday
  return dateFormat(date.getFullYear() !== now.getFullYear()).format(date)
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
