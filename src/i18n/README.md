# Internationalization (i18n) System

Fluxora uses a lightweight, fully-typed in-house React context provider for internationalization. This solution has **zero runtime dependencies**, guarantees **compile-time type safety** for translation keys, supports **HTML-escaping parameter interpolation** to prevent XSS, and handles **pluralization**.

## Key Design & Architecture

- **Catalog Location**: `src/i18n/en.ts` (contains the English base messages).
- **Core Engine**: `src/i18n/index.tsx` (contains the provider, hook, escaping, interpolation, and pluralization logic).
- **Types**:
  - `TranslationKey`: Derived directly from the keys of `en.ts`. Typo or missing keys fail at compile-time.
  - `PluralizableKey`: Automatically derived by stripping `_one` and `_other` suffixes from pluralized catalog keys.

---

## Key Naming Conventions

We use flat keys with **hierarchical dot-notation** to organize copy by surface, component, and element:

`[surface/component].[section].[element]`

### Examples:
- `"createStream.title"`: General title for the create stream modal.
- `"createStream.step1.header"`: Header text specific to step 1 of the flow.
- `"createStream.validation.recipientRequired"`: Validation error message.
- `"streams.hero.title"`: Title in the hero section of the Streams page.

---

## Translation Features

### 1. Simple Lookup
```tsx
import { useI18n } from '../i18n';

const { t } = useI18n();
return <h2>{t("createStream.title")}</h2>;
```

### 2. Parameter Interpolation (with Automatic XSS Protection)
Placeholders in the catalog are defined in curly braces `{variableName}`. The `t` helper automatically replaces placeholders and HTML-escapes the values for security.

Catalog:
```typescript
"createStream.step3.warningText": "{reviewDeposit} USDC will be locked in a Soroban smart contract."
```
Usage:
```tsx
t("createStream.step3.warningText", { reviewDeposit })
```

### 3. Pluralization
For keys representing countable nouns, define both `_one` (singular) and `_other` (plural) suffixes in the catalog. Pass a `count` parameter to `t()`, and it will automatically resolve the correct suffix at runtime.

Catalog:
```typescript
"createStream.duration.day_one": "day",
"createStream.duration.day_other": "days",
```
Usage:
```tsx
t("createStream.duration.day", { count }) // Returns "day" if count === 1, otherwise "days"
```

---

## How to Add a New Locale

To add a new language catalog (for example, Spanish - `es`):

### Step 1: Create the Catalog
Create a file under `src/i18n/` (e.g., `es.ts`) and define the localized messages:
```typescript
import { TranslationCatalog } from './index';

export const es: Partial<TranslationCatalog> = {
  "createStream.title": "Crear flujo",
  "createStream.description": "Establezca el destinatario, la financiación y los detalles del calendario...",
  "createStream.button.create": "Crear flujo",
  // Map any other keys needing Spanish translation
};
```

### Step 2: Register the Locale Type
Update the `Locale` union type in `src/i18n/index.tsx`:
```typescript
export type Locale = "en" | "es";
```

### Step 3: Register and Import the Catalog in the Provider
In `src/i18n/index.tsx`, import your new catalog and add it to the active catalog resolution:
```typescript
import { es } from "./es";

// In I18nProvider:
const catalog: TranslationCatalog = locale === "en" 
  ? en 
  : locale === "es"
    ? { ...en, ...es } // Fallback to English for untranslated keys
    : en;
```

### Step 4: Use the Locale Changer
Call `changeLocale` from any component:
```tsx
const { locale, changeLocale } = useI18n();

return (
  <button onClick={() => changeLocale("es")}>
    Switch to Spanish
  </button>
);
```
