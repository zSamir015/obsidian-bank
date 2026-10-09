/// <reference types="node" />
// Node types only for this test: it reads src/index.css from disk.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cn, THEME_TOKENS } from './cn'

// Each case is a clash that exists in this codebase: a base component class followed by a
// caller's className. The later class must win, and unrelated utilities must survive.
describe('cn', () => {
  it.each([
    ['button padding', ['h-11 px-5', 'px-0'], 'h-11 px-0'],
    [
      'skeleton radius (custom radius token)',
      ['rounded-full bg-surface-2', 'rounded-card'],
      'bg-surface-2 rounded-card',
    ],
    ['surface colors (custom color tokens)', ['bg-surface', 'bg-sunken'], 'bg-sunken'],
    ['border color (custom color tokens)', ['border border-hairline', 'border-danger'], 'border border-danger'],
    ['text color (custom color tokens)', ['text-muted', 'text-text'], 'text-text'],
    ['font size (custom text token)', ['text-sm', 'text-label'], 'text-label'],
    ['letter spacing (custom utility)', ['tracking-[-0.01em]', 'tracking-display'], 'tracking-display'],
  ])('lets the caller override: %s', (_, inputs, expected) => {
    expect(cn(...inputs)).toBe(expected)
  })

  it.each([
    ['label size and muted color', 'text-label font-medium text-muted uppercase'],
    ['relative cents size and muted color', 'text-[0.8em] text-muted'],
    ['background token and text token', 'bg-text text-bg'],
    ['card radius and hairline border', 'rounded-card border border-hairline'],
  ])('keeps utilities that do not clash: %s', (_, classes) => {
    expect(cn(classes)).toBe(classes)
  })

  it('accepts conditional and empty inputs', () => {
    const frozen = false
    expect(cn('h-full rounded-full', frozen && 'bg-muted/50', !frozen && 'bg-text', undefined, '')).toBe(
      'h-full rounded-full bg-text',
    )
  })
})

describe('THEME_TOKENS', () => {
  it('registers every custom token declared in src/index.css', () => {
    // Read from disk: Vitest does not process CSS, so importing it yields an empty module.
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    const declared = (prefix: string) =>
      [...css.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+?):`, 'g'))]
        .map((m) => m[1] ?? '')
        .filter((name) => !name.includes('--'))
    expect([...THEME_TOKENS.color].sort()).toEqual(declared('color').sort())
    expect([...THEME_TOKENS.radius].sort()).toEqual(declared('radius').sort())
    expect([...THEME_TOKENS.text].sort()).toEqual(declared('text').sort())
    expect(css).toContain('@utility tracking-display')
  })
})
