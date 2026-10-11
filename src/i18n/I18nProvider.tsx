import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { I18nContext } from './I18nContext'
import { storeLocale, type Locale } from './locales'
import { activateLocale, getLocale, getMessages } from './runtime'

/** Expects the starting language to be active already (see main.tsx), so the first paint is translated. */
export function I18nProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState(() => ({ locale: getLocale(), t: getMessages() }))

  const setLocale = useCallback((locale: Locale) => {
    storeLocale(locale)
    void activateLocale(locale).then((t) => setState({ locale, t }))
  }, [])

  const value = useMemo(() => ({ ...state, setLocale }), [state, setLocale])
  return <I18nContext value={value}>{children}</I18nContext>
}
