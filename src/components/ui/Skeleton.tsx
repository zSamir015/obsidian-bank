import { cn } from '@/lib/cn'

/** Loading placeholder; the pulse is disabled when the user prefers reduced motion. */
export function Skeleton({ className }: { readonly className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-full bg-surface-2 motion-safe:animate-pulse', className)} />
}
