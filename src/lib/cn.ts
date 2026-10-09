// Joins class names and resolves Tailwind conflicts so a caller's className reliably
// overrides a component's base classes. Tailwind itself resolves conflicts by stylesheet
// order, not by the order of classes in the attribute.
import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Custom tokens from the @theme block in src/index.css (plus the tracking-display utility).
// tailwind-merge only knows Tailwind's defaults; unregistered tokens are treated as
// unrelated (rounded-card vs rounded-full) or misclassified (text-label taken for a color,
// which would drop it next to text-muted). src/lib/cn.test.ts fails if this list drifts.
export const THEME_TOKENS = {
  color: ['bg', 'sunken', 'surface', 'surface-2', 'hairline', 'text', 'muted', 'accent', 'accent-strong', 'danger'],
  radius: ['card'],
  text: ['label'],
  tracking: ['display'],
} as const

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [...THEME_TOKENS.color],
      radius: [...THEME_TOKENS.radius],
      text: [...THEME_TOKENS.text],
      tracking: [...THEME_TOKENS.tracking],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
