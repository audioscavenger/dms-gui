import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
const supportedLngs = ['en', 'pl'];
import en from './locales/en/translation.json';
import pl from './locales/pl/translation.json';

const resources = {
  en: {
    translation: en,
  },
  pl: {
    translation: pl,
  },
};

// https://www.i18next.com/overview/configuration-options
i18n
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next
  .use(initReactI18next)
  // init i18next
  .init({
    fallbackLng: 'en',    // default language
    supportedLngs: supportedLngs,
    nonExplicitSupportedLngs: true, //support language variation
    interpolation: {
      escapeValue: false,   // not needed for react as it escapes by default
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    resources,
    debug: false,
  });

export default i18n;
