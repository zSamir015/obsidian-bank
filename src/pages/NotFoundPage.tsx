import { ButtonLink } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'

export default function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Label>Error 404</Label>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.01em]">This page doesn't exist</h1>
        <p className="mt-2 text-muted">Check the address, or go back to your overview.</p>
        <ButtonLink to="/" className="mt-8">
          Back to overview
        </ButtonLink>
      </div>
    </main>
  )
}
