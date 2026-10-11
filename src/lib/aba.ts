// ABA routing numbers: nine digits, an assigned Federal Reserve prefix and a weighted checksum.
// The same rules run on the server in public.aba_routing_is_valid (migration 007).

/** First two digits in use: 00–12 banks, 21–32 thrifts, 61–72 electronic, 80 traveler's checks. */
function hasAssignedPrefix(prefix: number): boolean {
  return (
    (prefix >= 0 && prefix <= 12) || (prefix >= 21 && prefix <= 32) || (prefix >= 61 && prefix <= 72) || prefix === 80
  )
}

export function isValidRoutingNumber(value: string): boolean {
  if (!/^\d{9}$/.test(value) || value === '000000000') return false
  if (!hasAssignedPrefix(Number(value.slice(0, 2)))) return false
  const d = [...value].map(Number)
  const sum = 3 * (d[0]! + d[3]! + d[6]!) + 7 * (d[1]! + d[4]! + d[7]!) + (d[2]! + d[5]! + d[8]!)
  return sum % 10 === 0
}

/** US account numbers run from 4 to 17 digits. Only the last four ever leave the browser. */
export function lastFourOfAccountNumber(value: string): string | null {
  const digits = value.replace(/[\s-]/g, '')
  return /^\d{4,17}$/.test(digits) ? digits.slice(-4) : null
}
