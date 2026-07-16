import { createContext, useContext, useMemo, useState } from "react";
import { translations } from "./translations";

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
    const value = key
      .split(".")
      .reduce(
        (obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined),
        pack,
      );

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

  const value = useMemo(
    () => ({
      lang,
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
