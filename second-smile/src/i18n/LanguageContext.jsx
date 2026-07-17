import { createContext, useContext, useMemo, useState } from "react";
import { translations } from "./translations";

const LOCALE_MAP = {
  uz: "uz-UZ",
  uz_cyr: "uz-Cyrl-UZ",
  uz_new: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window === "undefined") return "uz";
    return localStorage.getItem("lang") || "uz";
  });

  const changeLang = (next) => {
    setLang(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("lang", next);
    }
  };

  // Enhanced t() with {{var}} support
  const t = (key, interpolations = {}, fallback) => {
    const pack = translations[lang] || translations.uz;

    // Get nested value
    let value = key
      .split(".")
      .reduce(
        (obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined),
        pack,
      );

    // Fallback to uz (eski) if current lang doesn't have the key
    if (value === undefined && lang !== "uz") {
      value = key
        .split(".")
        .reduce(
          (obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined),
          translations.uz,
        );
    }
    // If still undefined and we have uz_new or uz_cyr, already fell back to uz above

    let result = value !== undefined ? value : fallback || key;

    // If interpolations provided and result is string → replace {{key}}
    if (interpolations && typeof result === "string") {
      result = result.replace(/\{\{(\w+)\}\}/g, (match, varKey) => {
        return interpolations[varKey] !== undefined
          ? interpolations[varKey]
          : match;
      });
    }

    return result;
  };

  const locale = LOCALE_MAP[lang] || "uz-UZ";

  const value = useMemo(
    () => ({
      lang,
      locale,
      setLang: changeLang,
      t,
    }),
    [lang],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}
