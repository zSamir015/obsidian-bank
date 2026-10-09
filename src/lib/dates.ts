const dateFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })

export function formatShortDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function isInCurrentMonth(iso: string, now = new Date()): boolean {
  const date = new Date(iso)
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}
