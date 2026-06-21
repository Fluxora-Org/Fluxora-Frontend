# Internationalization

Fluxora uses a small typed in-house catalog instead of a runtime i18n dependency.
The English catalog lives in `src/i18n/en.ts`, and UI code reads strings through
`useI18n().t("namespace.key")`.

## Adding Copy

1. Add the string under the closest namespace in `en.ts`.
2. Use descriptive dotted keys, for example `createStream.validation.walletRequired`.
3. Render it with `t("createStream.validation.walletRequired")`.
4. For interpolated values, use named placeholders: `Hello {name}`.

The key argument is typed from the English catalog, so missing or misspelled keys
fail during TypeScript checks.

## Adding A Locale

1. Create a new catalog with the same shape as `en`.
2. Register it in `src/i18n/index.tsx`.
3. Pass the locale to `I18nProvider`.

Catalog lookups are not driven by user input. Interpolated values are escaped by
the translator before substitution, and components render translated copy as
plain React text instead of `dangerouslySetInnerHTML`.
