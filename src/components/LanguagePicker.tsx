import { Languages } from 'lucide-react'
import { LOCALES, isLocale, type Locale } from '@/i18n/locales'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/cn'

/**
 * Native select: full keyboard and screen reader support, each language named in itself.
 * `compact` shows only the language code (for the mobile top bar); the select sits on top,
 * transparent, so tapping anywhere on it opens the system picker.
 */
export function LanguagePicker({
  compact = false,
  className,
}: {
  readonly compact?: boolean
  readonly className?: string
}) {
  const { locale, setLocale, t } = useI18n()
  return (
    <label
      className={cn(
        'relative inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm whitespace-nowrap text-muted hover:text-text',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text',
        className,
      )}
    >
      <Languages aria-hidden="true" className="size-[17px] shrink-0" strokeWidth={1.75} />
      <span className="sr-only">{t.language.label}</span>
      <span aria-hidden="true" className={compact ? 'uppercase' : undefined}>
        {compact ? locale : LOCALES[locale].label}
      </span>
      <select
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value)
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {(Object.keys(LOCALES) as Locale[]).map((code) => (
          <option key={code} value={code} lang={code}>
            {LOCALES[code].label}
          </option>
        ))}
      </select>
    </label>
  )
}
