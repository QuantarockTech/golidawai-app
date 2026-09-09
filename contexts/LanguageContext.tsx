import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LANGUAGES,
  translations,
  type Language,
  type TranslationKey,
} from "@/lib/i18n/translations";

const STORAGE_KEY = "golidawayi.language";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Look up a string, substituting {placeholders} from `vars`. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /**
   * True while Hindi is active. Call sites use it to swap in a Devanagari-
   * capable font — Raleway and Roboto cover Latin only, so headings and body
   * text would render as tofu on Android without the swap.
   */
  isHindi: boolean;
  /** False until the saved choice has been read, so nothing flashes in EN first. */
  isLoaded: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);

/** Falls back to Hindi only when the device is actually set to Hindi. */
const deviceLanguage = (): Language => {
  const tag = getLocales()[0]?.languageCode;
  return tag === "hi" ? "hi" : "en";
};

export function LanguageProvider({ children }: React.PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let stored: string | null = null;
      try {
        stored = await AsyncStorage.getItem(STORAGE_KEY);
      } catch {
        // A read failure just means we fall back to the device locale.
      }

      if (cancelled) return;

      setLanguageState(isLanguage(stored) ? stored : deviceLanguage());
      setIsLoaded(true);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    // Switch first, persist after: the UI shouldn't wait on storage, and a
    // failed write only costs the preference on next launch.
    setLanguageState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      /*
       * The key itself when there is no translation for it.
       *
       * TypeScript keeps both languages in step — `hi` is a
       * Record<TranslationKey, string>, so a missing one will not compile — but
       * that guarantee ends at the bundle. A half-applied update, a stale
       * cached bundle, or a language value that is neither "en" nor "hi" all
       * produce an undefined template at runtime.
       *
       * That used to be fatal rather than ugly. `template` went into the reduce
       * below as its initial value, so a missing key with variables threw
       * "undefined is not an object (evaluating 'text.split')" and took the
       * whole app down with it — a blank screen from one absent string.
       *
       * Showing "cart.forWhom" to a customer is bad. Showing them nothing at
       * all because a pharmacy app crashed is worse.
       */
      const template = translations[language]?.[key] ?? key;

      if (!vars) return template;

      return Object.entries(vars).reduce(
        (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
        template,
      );
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, isHindi: language === "hi", isLoaded }),
    [language, setLanguage, t, isLoaded],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
