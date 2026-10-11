import { useI18n } from '@/i18n/useI18n'

/**
 * Monochrome mark: a faceted obsidian shard. `collapse` keeps only the mark on screens under
 * 360px (the app's top bar), where the name stays available to screen readers.
 */
export function Logo({ collapse = false }: { readonly collapse?: boolean }) {
  const { t } = useI18n()
  return (
    <span className="flex items-center gap-2.5 text-[15px] whitespace-nowrap font-medium tracking-[-0.01em]">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 2.5 19.5 8 16.8 21H7.2L4.5 8Z" />
        <path d="M12 2.5V21M4.5 8 12 12l7.5-4" strokeOpacity=".45" />
      </svg>
      <span className={collapse ? 'max-[359px]:sr-only' : undefined}>{t.app.name}</span>
    </span>
  )
}
