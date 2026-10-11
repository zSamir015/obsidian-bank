import { ButtonLink } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { useI18n } from '@/i18n/useI18n'

export default function NotFoundPage() {
  const { t } = useI18n()
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Label>{t.notFound.eyebrow}</Label>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.01em]">{t.notFound.title}</h1>
        <p className="mt-2 text-muted">{t.notFound.body}</p>
        <ButtonLink to="/" className="mt-8">
          {t.app.backToOverview}
        </ButtonLink>
      </div>
    </main>
  )
}
