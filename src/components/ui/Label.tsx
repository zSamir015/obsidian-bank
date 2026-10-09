import type { ReactNode } from 'react'

/** 12px uppercase label, e.g. TOTAL BALANCE. */
export function Label({
  children,
  as: Tag = 'p',
}: {
  readonly children: ReactNode
  readonly as?: 'p' | 'span' | 'dt'
}) {
  return <Tag className="text-label font-medium text-muted uppercase">{children}</Tag>
}

/** Section titles are muted, never white. */
export function SectionTitle({
  id,
  children,
  action,
}: {
  readonly id: string
  readonly children: ReactNode
  readonly action?: ReactNode
}) {
  return (
    <div className="mb-5 flex min-h-9 items-center justify-between gap-4">
      <h2 id={id} className="text-xl font-medium tracking-[-0.01em] text-muted">
        {children}
      </h2>
      {action}
    </div>
  )
}
