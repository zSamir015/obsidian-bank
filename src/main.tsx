import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initialLocale } from './i18n/locales'
import { activateLocale } from './i18n/runtime'

// Load the starting language before the first render, so nothing flashes in English.
// English is bundled; other catalogues are small separate chunks.
void activateLocale(initialLocale())
  .catch(() => activateLocale('en'))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
