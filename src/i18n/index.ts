/**
 * i18n setup — react-i18next with en/ms/zh/ja/bn locale files and browser language detection.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ms from "./locales/ms.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import bn from "./locales/bn.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ms: { translation: ms },
      zh: { translation: zh },
      ja: { translation: ja },
      bn: { translation: bn },
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "alarm_app_language",
      caches: ["localStorage"],
    },
  });

export default i18n;
