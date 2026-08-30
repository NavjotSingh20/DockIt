import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';

const savedLang = localStorage.getItem('i18nextLng') || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi }
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

// Automatically sync html lang attribute for Devanagari CSS font-family cascade
if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language || 'en';
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
    localStorage.setItem('i18nextLng', lng);
  });
}

export default i18n;
