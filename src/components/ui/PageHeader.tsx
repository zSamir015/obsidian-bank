import type { ReactNode } from 'react'

export function PageHeader({ title, children }: { readonly title: string; readonly children?: ReactNode }) {
  return (
    <header className="mb-10 md:mb-14">
      <h1 className="text-[2.5rem] leading-tight font-medium tracking-[-0.01em]">{title}</h1>
      {children && <p className="mt-2 text-muted">{children}</p>}
    </header>
  )
}
