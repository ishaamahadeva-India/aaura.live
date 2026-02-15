
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "@/translations";

// Supported languages
export type LanguageCode = "en" | "te" | "hi" | "mr" | "ta" | "kn" | "bn";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: typeof translations.en; // current language dictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  // Load saved language from localStorage on initial render
  useEffect(() => {
    const savedLang = localStorage.getItem("app-language") as LanguageCode;
    if (savedLang && translations[savedLang]) {
      setLanguageState(savedLang);
      document.documentElement.lang = savedLang;
    }
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("app-language", lang);
      document.documentElement.lang = lang;
    }
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language] || translations.en,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
