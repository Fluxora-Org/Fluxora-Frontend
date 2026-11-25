import { useI18n, SELECTABLE_LOCALES, type Locale } from "../../i18n";

/**
 * Compact language picker rendered next to the theme toggle in the navbar.
 *
 * Uses a native `<select>` so it is keyboard-accessible, screen-reader
 * labelled, and does not need a popover library. The current choice is
 * persisted and reflected on `<html lang>` by `I18nProvider`.
 */
export default function LanguagePicker() {
  const { locale, changeLocale } = useI18n();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        value={locale === "zx" ? "en" : locale}
        onChange={(e) => changeLocale(e.target.value as Locale)}
        className="appearance-none rounded-md border border-[var(--navbar-icon-border)] bg-transparent px-2 py-1 pr-6 text-xs font-medium text-[var(--navbar-icon-color)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
      >
        {SELECTABLE_LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-1.5 h-3 w-3 text-[var(--navbar-icon-color)]"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </label>
  );
}
