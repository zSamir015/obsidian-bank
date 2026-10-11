import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n/useI18n'

/** Errors use the amber danger color, always together with an icon and text. */
export function ErrorMessage({ children, onRetry }: { readonly children: ReactNode; readonly onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div role="alert" className="flex items-start gap-2 text-sm text-danger">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>
        {children}{' '}
        {onRetry && (
          <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2">
            {t.app.tryAgain}
          </button>
        )}
      </p>
    </div>
  )
}
