import { en, type EnglishCatalog } from "./en";

const catalogs = {
  en,
} as const;

type Primitive = string | number | boolean | null | undefined;
export type MessageParams = Record<string, Primitive>;
type StringLeafPaths<T, Prefix extends string = ""> = {
  [Key in keyof T & string]: T[Key] extends string
    ? `${Prefix}${Key}`
    : T[Key] extends Record<string, unknown>
      ? StringLeafPaths<T[Key], `${Prefix}${Key}.`>
      : never;
}[keyof T & string];

export type Locale = keyof typeof catalogs;
export type MessageKey = StringLeafPaths<EnglishCatalog>;
export type TFunction = <Key extends MessageKey>(
  key: Key,
  params?: MessageParams,
) => string;
export type PluralFunction = (
  count: number,
  forms: { one: MessageKey; other: MessageKey },
) => string;

export function getCatalog(locale: Locale): EnglishCatalog {
  return catalogs[locale];
}

function getCatalogValue(catalog: EnglishCatalog, key: MessageKey): string {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, catalog);

  return typeof value === "string" ? value : key;
}

export function escapeInterpolationValue(value: Primitive): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function interpolateMessage(
  template: string,
  params: MessageParams = {},
): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) => {
    if (!(name in params)) return match;
    return escapeInterpolationValue(params[name]);
  });
}

export function createT(catalog: EnglishCatalog = en): TFunction {
  return ((key: MessageKey, params?: MessageParams) => {
    return interpolateMessage(getCatalogValue(catalog, key), params);
  }) as TFunction;
}
