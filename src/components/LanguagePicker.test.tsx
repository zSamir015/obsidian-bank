import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { I18nProvider } from '@/i18n/I18nProvider'
import { STORAGE_KEY } from '@/i18n/locales'
import { activateLocale } from '@/i18n/runtime'
import { LanguagePicker } from './LanguagePicker'

afterEach(async () => {
  localStorage.clear()
  await activateLocale('en')
})

describe('LanguagePicker', () => {
  it('switches the interface, remembers the choice and sets the page language', async () => {
    render(
      <I18nProvider>
        <LanguagePicker />
        <ErrorMessage onRetry={() => {}}>x</ErrorMessage>
      </I18nProvider>,
    )
    const picker = screen.getByRole('combobox', { name: 'Language' })
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()

    await userEvent.selectOptions(picker, 'es')

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Idioma' })).toHaveValue('es')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('es')
    expect(document.documentElement.lang).toBe('es')
  })

  it('names each language in that language', () => {
    render(<LanguagePicker />)
    expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('option', { name: 'Español' })).toHaveAttribute('lang', 'es')
  })
})
