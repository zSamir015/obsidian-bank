import type { ReactNode } from 'react'

/** Small hairline pill for states such as Pending or Frozen. */
export function Tag({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-hairline px-2.5 text-[11px] font-medium text-muted">
      {children}
    </span>
  )
}
