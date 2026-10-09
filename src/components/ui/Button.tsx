import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'sm' | 'icon'

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&>svg]:shrink-0'

const variants: Record<Variant, string> = {
  primary: 'bg-text text-bg hover:bg-zinc-200 active:bg-zinc-300',
  secondary: 'border border-hairline text-text hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
}

// Dimensions come from `size`; className still overrides any base class through cn().
const sizes: Record<Size, string> = {
  md: 'h-11 px-5',
  sm: 'h-9 px-4',
  icon: 'size-10',
}

interface Styling {
  readonly variant?: Variant
  readonly size?: Size
}

const buttonClass = ({ variant = 'primary', size = 'md', className }: Styling & { className?: string }) =>
  cn(base, sizes[size], variants[variant], className)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, Styling {
  readonly loading?: boolean
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, className })}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, className, ...props }: LinkProps & Styling) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />
}
