import { describe, expect, it } from 'vitest'
import { dayLabel, groupByDay } from './dates'

const now = new Date(2026, 9, 9, 15)

describe('dayLabel', () => {
  it.each([
    [new Date(2026, 9, 9, 1), 'Today'],
    [new Date(2026, 9, 8, 23), 'Yesterday'],
    [new Date(2026, 9, 7, 12), 'Oct 7'],
    [new Date(2025, 11, 31, 12), 'Dec 31, 2025'],
  ])('labels %s as %s', (date, label) => {
    expect(dayLabel(date.toISOString(), now)).toBe(label)
  })
})

describe('groupByDay', () => {
  it('keeps the incoming order and starts a group at each new local day', () => {
    const items = [
      { id: 'a', date: new Date(2026, 9, 9, 9).toISOString() },
      { id: 'b', date: new Date(2026, 9, 9, 1).toISOString() },
      { id: 'c', date: new Date(2026, 9, 7, 12).toISOString() },
    ]
    expect(groupByDay(items, now).map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ['Today', ['a', 'b']],
      ['Oct 7', ['c']],
    ])
  })
})
