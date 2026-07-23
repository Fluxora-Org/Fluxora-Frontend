import { createContext, useContext, useState, ReactNode } from "react";
import { en } from "./en";

/**
 * Supported locales in the application.
 */
export type Locale = "en" | "es";

/**
 * The structure of the translation catalog, based on the English catalog.
 */
export type TranslationCatalog = typeof en;

/**
 * All valid translation keys, ensuring compile-time safety and preventing
 * untrusted dynamic lookups.
 */
export type TranslationKey = keyof TranslationCatalog;

/**
 * Derived keys that support pluralization by stripping '_one' and '_other' suffixes.
 */
export type PluralizableKey = {
  [K in TranslationKey]: K extends `${infer Base}_one`
    ? Base
    : K extends `${infer Base}_other`
      ? Base
      : never;
}[TranslationKey];

/**
 * Parameters for translation interpolation.
 */
export type TranslationParams = Record<string, string | number>;

export interface I18nContextType {
  /** The current active locale. */
  locale: Locale;
  /**
   * Retrieves the translated message for a given key, performs interpolation,
   * escapes user input, and handles pluralization.
   */
  t: (key: TranslationKey | PluralizableKey, params?: TranslationParams) => string;
  /** Changes the active locale. */
  changeLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

/**
 * Helper function to escape HTML characters in user-provided values
 * to prevent XSS vulnerabilities if translations are rendered unsafely.
 *
 * @param value The raw string to escape.
 * @returns The HTML-escaped string.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Default Spanish catalog for demonstration and locale-adding documentation verification.
 * Contains translation keys mapped to Spanish copy.
 */
const es: Partial<TranslationCatalog> = {
  "createStream.title": "Crear flujo",
  "createStream.description": "Establezca el destinatario, la financiación y los detalles del calendario para un nuevo flujo Stellar.",
  "createStream.button.create": "Crear flujo",
  "createStream.button.next": "Siguiente",
  "createStream.button.back": "Atrás",
  "createStream.button.cancel": "Cancelar",
};

/**
 * Resolves a translation key to its corresponding message, handles fallback,
 * pluralization, and interpolates/escapes parameters.
 *
 * @param catalog The translation catalog to look up keys in.
 * @param key The translation key or a base pluralizable key.
 * @param params Optional parameters for interpolation and pluralization.
 * @returns The resolved and interpolated translation string.
 */
export function translate(
  catalog: TranslationCatalog,
  fallbackCatalog: TranslationCatalog,
  key: TranslationKey | PluralizableKey,
  params?: TranslationParams
): string {
  // Pluralization check: if params has 'count', look for pluralized keys
  let resolvedKey = key;
  if (params && typeof params.count === "number") {
    const suffix = params.count === 1 ? "_one" : "_other";
    const pluralKey = `${key}${suffix}` as TranslationKey;
    // Check if the plural key exists in the catalog
    if (pluralKey in catalog || pluralKey in fallbackCatalog) {
      resolvedKey = pluralKey;
    }
  }

  // Get value from current catalog, fallback to English catalog, and finally to the key itself
  const value: string = (catalog as any)[resolvedKey] || (fallbackCatalog as any)[resolvedKey];
  if (!value) {
    return resolvedKey;
  }

  // Interpolation and Escaping
  if (params) {
    let result = value;
    for (const [paramKey, paramValue] of Object.entries(params)) {
      const escapedValue = escapeHtml(String(paramValue));
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), escapedValue);
    }
    return result;
  }

  return value;
}

interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

/**
 * I18nProvider wraps the React application to provide a typed internationalization
 * context, offering access to current locale, locale switching, and translation function.
 *
 * @param props Component properties containing children and optional default locale.
 */
export function I18nProvider({ children, defaultLocale = "en" }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  // Active catalog selection
  const catalog: TranslationCatalog = locale === "en" ? en : ({ ...en, ...es } as TranslationCatalog);

  const t = (key: TranslationKey | PluralizableKey, params?: TranslationParams): string => {
    return translate(catalog, en, key, params);
  };

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return (
    <I18nContext.Provider value={{ locale, t, changeLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Custom hook to access the typed internationalization context.
 *
 * @returns The i18n context containing locale, t() function, and changeLocale.
 * @throws Error if used outside of an I18nProvider.
 */
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
