import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`rounded-card border border-hairline bg-surface p-6 ${className}`} {...props} />
}
