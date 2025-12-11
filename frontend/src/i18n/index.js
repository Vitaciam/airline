import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en/translations.json';
import ruTranslations from './locales/ru/translations.json';
import roTranslations from './locales/ro/translations.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      ru: {
        translation: ruTranslations
      },
      ro: {
        translation: roTranslations
      }
    },
    fallbackLng: 'ro',
    debug: false,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

