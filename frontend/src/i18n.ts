import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import shared translations from root locales directory
import enTranslation from '../../locales/en.json';

i18n
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
    },
    fallbackLng: 'en',
    lng: 'en', // Force English
    debug: process.env.NODE_ENV === 'development',

    // Common namespace used for all translations
    defaultNS: 'translation',

    interpolation: {
      escapeValue: false, // React already safe from XSS
    },
  });

export default i18n;
