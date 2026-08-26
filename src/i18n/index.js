/**
 * src/i18n/index.js
 * i18next configuration — English + Kannada.
 * Language preference persisted to localStorage.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import kn from './kn.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      kn: { translation: kn },
    },
    lng: localStorage.getItem('complianceai_lang') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  })

// Persist language changes
i18n.on('languageChanged', (lang) => {
  localStorage.setItem('complianceai_lang', lang)
  document.documentElement.lang = lang
})

export default i18n
