import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  createT,
  getCatalog,
  type Locale,
  type PluralFunction,
  type TFunction,
} from "./core";

type I18nContextValue = {
  locale: Locale;
  t: TFunction;
  plural: PluralFunction;
};

function createI18nValue(locale: Locale): I18nContextValue {
  const catalog = getCatalog(locale);
  const t = createT(catalog);

  return {
    locale,
    t,
    plural(count, forms) {
      return t(count === 1 ? forms.one : forms.other);
    },
  };
}

const defaultI18nValue = createI18nValue("en");
const I18nContext = createContext<I18nContextValue>(defaultI18nValue);

/**
 * Provides the typed message catalog for UI copy.
 *
 * New locales should keep the same key shape as the English catalog so calls to
 * t("namespace.key") remain compile-time checked.
 */
export function I18nProvider({
  children,
  locale = "en",
}: {
  children: ReactNode;
  locale?: Locale;
}) {
  const value = useMemo(() => createI18nValue(locale), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Returns the typed translator and plural helper for the active locale.
 */
export function useI18n() {
  return useContext(I18nContext);
}
