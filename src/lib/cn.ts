import { clsx, type ClassValue } from 'clsx'

export const THEME_TOKENS = {
  color: ['bg', 'sunken', 'surface', 'surface-2', 'hairline', 'text', 'muted', 'accent', 'accent-strong', 'danger'],
  radius: ['card'],
  text: ['label'],
  tracking: ['display'],
} as const

const textSizeTokens = new Set(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'])
const paddingConflicts: Record<string, readonly string[]> = {
  p: ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe'],
  px: ['px', 'pl', 'pr'],
  py: ['py', 'pt', 'pb'],
  pt: ['pt'],
  pr: ['pr'],
  pb: ['pb'],
  pl: ['pl'],
  ps: ['ps'],
  pe: ['pe'],
}

function utilityGroup(token: string): string | undefined {
  const padding = token.match(/^-?p[trblsexy]?-.+/)
  if (padding) return padding[0].match(/^-?p[trblsexy]?/)?.[0].replace('-', '')
  if (/^-?size-.+/.test(token)) return 'size'
  if (/^-?w-.+/.test(token)) return 'w'
  if (/^-?h-.+/.test(token)) return 'h'
  if (/^rounded(?:-.+)?$/.test(token)) return 'rounded'
  if (/^bg-.+/.test(token)) return 'bg'
  if (/^border(?:-.+)?$/.test(token)) {
    const value = token.slice('border'.length).replace(/^-/, '')
    if (
      !value ||
      /^(0|2|4|8|x|y|s|e|t|r|b|l)(-|$)/.test(value) ||
      /^(solid|dashed|dotted|double|hidden|none)$/.test(value)
    ) {
      return 'border-width'
    }
    return 'border-color'
  }
  if (/^text-.+/.test(token)) {
    const value = token.slice(5)
    if (textSizeTokens.has(value) || value === 'label' || /^\[(length|size):/.test(value) || /^\[[-.\d]/.test(value)) {
      return 'text-size'
    }
    return 'text-color'
  }
  if (/^tracking-.+/.test(token)) return 'tracking'
  return undefined
}

function splitVariants(token: string): { readonly variants: string; readonly utility: string } {
  let depth = 0
  let separator = -1
  for (let index = 0; index < token.length; index += 1) {
    if (token[index] === '[') depth += 1
    else if (token[index] === ']') depth -= 1
    else if (token[index] === ':' && depth === 0) separator = index
  }
  return { variants: separator < 0 ? '' : token.slice(0, separator + 1), utility: token.slice(separator + 1) }
}

export function cn(...inputs: ClassValue[]): string {
  const classes = clsx(inputs).split(/\s+/).filter(Boolean)
  const seen = new Map<string, Set<string>>()
  const seenTokens = new Set<string>()
  const result: string[] = []

  for (let index = classes.length - 1; index >= 0; index -= 1) {
    const token = classes[index]!
    const { variants, utility } = splitVariants(token)
    if (seenTokens.has(token)) continue
    seenTokens.add(token)
    const group = utilityGroup(utility)
    if (!group) {
      result.push(token)
      continue
    }

    const modifierGroups = seen.get(variants) ?? new Set<string>()
    const conflicts = paddingConflicts[group] ?? [group]
    if (conflicts.some((candidate) => modifierGroups.has(candidate))) continue
    modifierGroups.add(group)
    seen.set(variants, modifierGroups)
    result.push(token)
  }

  return result.reverse().join(' ')
}
