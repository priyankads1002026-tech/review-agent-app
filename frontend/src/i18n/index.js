// i18n bootstrap. Initialized once (imported by main.jsx before <App/> renders).
// Language detection order: saved localStorage choice → browser language → 'en'.
// Arabic is RTL, so we expose LANGUAGES with a `dir` and keep the <html> lang/dir
// in sync via applyDocumentLang() (called from App on language change).
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import ar from "./locales/ar.json";
import hi from "./locales/hi.json";

// Single source of truth for the switcher UI and for text direction.
export const LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "hi", label: "हिन्दी", dir: "ltr" },
];

export const dirFor = (code) =>
  LANGUAGES.find((l) => l.code === code)?.dir ?? "ltr";

// Reflect the active language on <html> so the whole page flips for RTL and so
// screen readers announce the right language.
export const applyDocumentLang = (code) => {
  document.documentElement.setAttribute("lang", code);
  document.documentElement.setAttribute("dir", dirFor(code));
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      ar: { translation: ar },
      hi: { translation: hi },
    },
    fallbackLng: "en",
    supportedLngs: LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      // Persist the user's pick under the same-style key our theme toggle uses.
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
