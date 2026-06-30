import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform, NativeModules } from 'react-native';

import en from './en.json';
import tr from './tr.json';

const getDeviceLanguage = () => {
  let locale = 'en';
  if (Platform.OS === 'ios') {
    locale = NativeModules.SettingsManager?.settings?.AppleLocale ||
             NativeModules.SettingsManager?.settings?.AppleLanguages[0] || 'en';
  } else if (Platform.OS === 'android') {
    locale = NativeModules.I18nManager?.localeIdentifier || 'en';
  }
  return locale.split('_')[0].split('-')[0]; // Extract 'en' or 'tr'
};

const deviceLanguage = getDeviceLanguage();
const defaultLanguage = ['en', 'tr'].includes(deviceLanguage) ? deviceLanguage : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safe from xss
    },
  });

export default i18n;
