import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'

type Variant = 'primary' | 'secondary' | 'ghost'

const base =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-text text-bg hover:bg-zinc-200 active:bg-zinc-300',
  secondary: 'border border-hairline text-text hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
}

const buttonClass = (variant: Variant = 'primary', className = '') => `${base} ${variants[variant]} ${className}`

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant
  readonly loading?: boolean
}

export function Button({
  variant,
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
      className={buttonClass(variant, className)}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, className, ...props }: LinkProps & { readonly variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />
}
