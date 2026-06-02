# Navigation Hierarchy & Breadcrumb Pattern
**Issue:** #235  
**Status:** Implemented  
**WCAG Target:** 2.1 AA  
**Breakpoints:** 320 · 375 · 768 · 1024px

---

## Problem
Users on stream detail pages (`/app/streams/:streamId`) had no semantic
breadcrumb to return to the streams list. The navbar also applied identical
visual weight to all nav items — primary destinations (Dashboard, Streams,
Recipient) looked the same as any future secondary/utility items (Settings,
Help), making hierarchy unclear.

---

## Navigation Hierarchy

### Primary destinations
High visual weight. These are the main sections a user navigates between.

| Item | Route | Role |
|---|---|---|
| Dashboard | `/app` | Overview and metrics |
| Streams | `/app/streams` | Create and manage streams |
| Recipient | `/app/recipient` | View incoming streams |

### Secondary / utility items
Reduced visual weight (`--nav-secondary-font`, `--nav-secondary-color`).
Separated from primary items by a 1px divider.
Currently reserved for Settings, Help when added.

### Visual differentiation
| Property | Primary | Secondary |
|---|---|---|
| Font | `--font-label-lg` (500 14px) | `--font-label-md` (500 12px) |
| Default color | `--navbar-link-color` | `--color-text-muted` |
| Active indicator | Left border 2px `--color-accent-secondary` | None |
| Active background | 12% accent tint | None |

---

## Breadcrumb Pattern

### When it appears
The breadcrumb row renders below the main navbar bar when the user is
**2+ levels deep** in the app — e.g. `/app/streams/STR-001`.

It does **not** appear on top-level pages (`/app`, `/app/streams`,
`/app/recipient`).

### Structure
```
Streams  /  STR-001          ← breadcrumb row
         ↑              ↑
    link (to /app/streams)   current page (no link, aria-current="page")
```

### ARIA
```html
<nav aria-label="Breadcrumb">
  <ol>
    <li>
      <a href="/app/streams">Streams</a>
      <span aria-hidden="true">/</span>
    </li>
    <li>
      <span aria-current="page">STR-001</span>
    </li>
  </ol>
</nav>
```

### Stellar address handling
Long Stellar addresses (56-char `G...`) are truncated to `GABCD123…XY4Z`
with a `title` attribute exposing the full address on hover.

---

## States — All Nav Items

| State | Background | Text color | Border |
|---|---|---|---|
| Default | transparent | `--nav-primary-color` | none |
| Hover | `--nav-primary-bg-hover` | `--nav-primary-color-hover` | none |
| Focus | transparent + focus ring | `--nav-primary-color-hover` | none |
| Active | `--nav-primary-bg-active` | `--nav-primary-color-active` | left 2px `--color-accent-secondary` |
| Disabled | transparent | `--color-text-muted` 40% | none |

Focus ring: `0 0 0 2px var(--color-bg-primary), 0 0 0 4px var(--color-focus)`

---

## Breadcrumb States

| State | Color | Decoration |
|---|---|---|
| Link default | `--breadcrumb-color` | none |
| Link hover | `--breadcrumb-color-hover` | underline |
| Link focus | `--breadcrumb-color-hover` + focus ring | — |
| Current page | `--breadcrumb-color-current` | none (not a link) |
| Separator | `--breadcrumb-separator-color` | aria-hidden |

---

## Accessibility Checklist

- [x] `nav[aria-label="Breadcrumb"]` wraps the trail
- [x] `ol > li` structure (ordered list, represents hierarchy)
- [x] `aria-current="page"` on current page item
- [x] Separators are `aria-hidden="true"`
- [x] All links keyboard-focusable with `:focus-visible` ring
- [x] Focus ring contrast: 3:1 `--color-focus` against background ✅
- [x] Text contrast: 4.5:1 `--breadcrumb-color` against background ✅
- [x] Touch targets: 44×44px minimum on mobile ✅
- [x] Long addresses truncated with `title` for full value ✅
- [x] `prefers-reduced-motion` respected via global token rule ✅
- [x] `aria-label` on `<nav>` distinguishes from main navigation ✅

---

## Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| 320px | Breadcrumb wraps to 2 lines if needed; `flex-wrap: wrap` |
| 375px | Same |
| 768px | Single line; sidebar toggle appears |
| 1024px | Full desktop layout |

---

## Files Changed

| File | Change |
|---|---|
| `src/design-tokens.css` | Added `--nav-*` and `--breadcrumb-*` tokens |
| `src/components/navigation/Breadcrumb.tsx` | New breadcrumb component |
| `src/components/navigation/AppNavbar.tsx` | Wired breadcrumb; split primary/secondary nav |
| `src/components/navigation/NavLink.tsx` | Added `variant` prop for secondary weight |
| `src/styles/accessibility.css` | Added `.breadcrumb-link:focus-visible` rule |
| `docs/NAVBAR_HIERARCHY_BREADCRUMB_SPEC.md` | This spec |

---

## Edge Cases

| Case | Handling |
|---|---|
| 56-char Stellar address as stream ID | Truncated `GABCD…XY4Z` with full address in `title` |
| Unknown route segment | Displayed as-is (no labelMap entry needed) |
| Single-level deep page | Breadcrumb hidden (`items.length <= 1`) |
| Stream not found | `StreamNotFound` page still shows breadcrumb via navbar |