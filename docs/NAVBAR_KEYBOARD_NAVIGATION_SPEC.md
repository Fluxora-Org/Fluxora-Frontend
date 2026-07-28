# Navbar Keyboard Navigation & Focus Order
**Component:** `src/components/navigation/AppNavbar.tsx`
**Status:** Documented (behavior locked by tests, no behavior changes)
**WCAG Target:** 2.1 AA
**Regression tests:** `src/components/navigation/__tests__/AppNavbar.keyboard.test.tsx`

---

## Purpose

The happy path of the navbar (Tab through links, Enter to navigate) already
works. This spec makes the **implicit edge cases explicit** — top-level
navigation link sets, keyboard focus order, loading/connecting state,
tooltip dismissal, and known quirks — so the current behavior is
regression-safe. Nothing in this spec introduces new behavior; it describes
the navbar **as shipped today** and is fully backward compatible with the
current frontend release.

---

## 1. Top-Level Navigation

### Link sets by wallet state

| Wallet state | `nav` aria-label | Links |
|---|---|---|
| Anonymous | `Marketing navigation` | Features (`/#features`), Docs (`/#docs`), Pricing (`/#pricing`) |
| Connected | `App navigation` | Dashboard (`/app`), Streams (`/app/streams`), Recipient (`/app/recipient`) |

Secondary links (`APP_SECONDARY_LINKS`) are currently an empty list — the
divider + secondary group only renders once entries exist.

### Interaction model

Top-level links are **plain anchors** (`NavLink` → react-router `Link`):

- **Tab / Shift+Tab** moves between links in DOM order.
- **Enter** activates the focused link (native anchor semantics).
- There is **no roving tabindex** and **no Arrow / Home / End handling**
  on the top-level nav. Every enabled link is an individual tab stop.
- The active link carries `aria-current="page"` via segment-aware matching.
- Disabled links carry `aria-disabled="true"`, `tabIndex={-1}` and
  `pointer-events: none` — they are removed from the tab order entirely.

### Known quirk: prefix-match `aria-current`

`NavLink` matches by path-segment **prefix** unless the `end` prop is set.
`AppNavbar` does not pass `end`, so on `/app/streams` **both** Dashboard
(`/app`) and Streams (`/app/streams`) report `aria-current="page"`. This is
the shipped behavior and is locked by tests as-is; changing it would be a
behavioral (not merely cosmetic) change.

---

## 2. Keyboard Focus Order

Focus order is **pure DOM order** — there is no focus management at the
navbar level. Full sequence (connected, app view):

```
1. Sidebar toggle        (app view only; CSS-hidden ≥ md)
2. Fluxora logo link     (→ /app when connected, / otherwise)
3. Nav links             (Dashboard → Streams → Recipient)
4. Time indicator button
5. Command palette button (dispatches "open-command-palette", advertises ⌘K)
6. Voice mic button
7. Easy-read font toggle  (Type icon)
8. Theme segmented control (radiogroup "theme preference")
9. Wallet area            (WalletStatus trigger, or Connect Wallet link)
10. Second easy-read toggle ("Aa" — mobile duplicate, CSS-hidden ≥ md… see quirk)
11. Second wallet area      (mobile duplicate)
```

Anonymous users get the same order minus the sidebar toggle, with the
marketing link set at step 3 and the Connect Wallet link in the wallet areas.

### Known quirk: duplicate tab stops

The easy-read font toggle and the wallet area are rendered **twice** — once
inside the `hidden md:flex` desktop cluster and once outside it. Visibility
is controlled purely by CSS classes, so:

- In the browser, only one copy is visible per breakpoint, but the hidden
  copy is hidden with `display: none` (not focusable — no keyboard trap).
- In jsdom (unit tests) no stylesheet applies, so **both** copies are
  rendered and focusable. Tests must use `getAllByRole` for these controls.

---

## 3. Component States

### A. Connecting (loading) state

On every mount, `AppNavbar` simulates a wallet-restore window:

- For **600 ms** the wallet area renders `ConnectingSkeleton`
  (`role="status"`, `aria-label="Connecting wallet…"`, pulsing placeholders).
- During this window the wallet controls are **not focusable** (they don't
  exist yet), but the logo, nav links, time indicator and other controls
  remain fully keyboard reachable — no focus trap, no dead ends.
- After the timeout, the skeleton is replaced by `WalletStatus` (connected)
  or the Connect Wallet link (anonymous). Focus is **not** programmatically
  moved when the swap happens.

### B. Time indicator (tooltip)

The only `onKeyDown` handler in `AppNavbar` itself:

| Key / event | Behavior |
|---|---|
| Tab (focus) | Opens the tooltip, refreshes the displayed time |
| Escape | Closes the tooltip; **focus stays on the button** |
| Blur (Tab away) | Closes the tooltip |
| Enter / click | Toggles the tooltip |

Button: `aria-expanded`, `aria-describedby="navbar-time-tooltip"`.
Tooltip: `role="tooltip"`, `pointer-events: none` (never focusable, never a
keyboard trap). See `NAVBAR_TIMEZONE_INDICATOR_SPEC.md` for full details.

### C. Sidebar toggle (responsive, app view only)

Rendered **only** when the wallet is connected **and** the route starts with
`/app`. It is a controlled button:

- `aria-label`: `Open navigation sidebar` / `Close navigation sidebar`
- `aria-expanded` mirrors the `isSidebarOpen` prop
- `aria-controls="app-sidebar"`
- Activation calls `onSidebarToggle` (state owned by `App.tsx`)

Anonymous users and non-`/app` routes never render this button.

### D. Mobile marketing menu — unreachable (documented as-is)

The mobile marketing dropdown (`#mobile-nav`,
`aria-label="Marketing navigation"`) is gated on `mobileMenuOpen`, but **no
UI control ever sets it to `true`** — the Menu/X icon in the anonymous
navbar is the Connect Wallet **link**, not a menu toggle, and `closeMobile`
only sets `false`. Consequences, locked by tests:

- `#mobile-nav` never renders; no element has `aria-controls="mobile-nav"`.
- The menu therefore has no Escape handling, focus trap, or focus return —
  acceptable only because it is unreachable.
- Any future work that re-enables the menu **must** add a real toggle
  button plus Escape/focus-return handling, and will intentionally break
  the "unreachable" regression test.

### E. Wallet dropdown (WalletStatus)

The richest keyboard logic in the navbar lives in `WalletStatus`, already
covered by `WalletStatus.keyboard.test.tsx`:

- ArrowDown/ArrowUp on the closed trigger opens the menu focusing the
  first/last item; open-menu arrows move focus with wraparound.
- Tab/Shift+Tab are trapped between the first and last menu item.
- Escape (document-level) closes and returns focus to the trigger.

### F. Breadcrumb row

Renders only when connected, on `/app` routes, 2+ segments deep. Breadcrumb
links are ordinary anchors in the natural tab order after the navbar row;
the current page is a non-focusable `span[aria-current="page"]`.

---

## 4. Regression Surface

What the tests lock, and what a change would mean:

| Behavior | Locked by | Breaking it means |
|---|---|---|
| Link sets + nav aria-label per wallet state | `AppNavbar.keyboard.test.tsx` | Top-level IA changed |
| DOM-order tab sequence (logo → links → time indicator) | `AppNavbar.keyboard.test.tsx` | Focus order changed |
| No roving tabindex (every enabled link tabbable, none `tabIndex=-1`) | `AppNavbar.keyboard.test.tsx` | Interaction model changed |
| Prefix-match `aria-current` (Dashboard active on `/app/streams`) | `AppNavbar.keyboard.test.tsx` | Active-state semantics changed |
| Time tooltip: focus-open / Escape-close / blur-close | `AppNavbar.keyboard.test.tsx` | Tooltip keyboard contract changed |
| Connecting skeleton `role="status"` + nav reachable while loading | `AppNavbar.keyboard.test.tsx` | Loading a11y contract changed |
| Sidebar toggle ARIA (`aria-expanded`/`aria-controls`) + app-view gating | `AppNavbar.keyboard.test.tsx`, `AppNavbar.accessibility.test.tsx` | Responsive nav contract changed |
| Mobile marketing menu unreachable | `AppNavbar.keyboard.test.tsx` | Menu re-enabled — requires new a11y work |
| Command palette button keyboard activation (`open-command-palette`) | `AppNavbar.keyboard.test.tsx` | Palette entry point changed |
| Wallet dropdown arrows / trap / Escape | `WalletStatus.keyboard.test.tsx` | Menu keyboard contract changed |

Out of scope (unchanged, pre-existing): timezone-formatting assertions in
`AppNavbar.timezone.test.tsx` (environment-timezone sensitive) and clipboard
behavior in `WalletStatus.copy.test.tsx`.

---

## Accessibility Checklist (current state)

- [x] All interactive navbar controls reachable by Tab in DOM order
- [x] No keyboard trap anywhere in the navbar (browser; hidden duplicates use `display: none`)
- [x] `aria-current="page"` on active top-level link(s)
- [x] Disabled links removed from tab order (`tabIndex=-1`)
- [x] Loading state announced via `role="status"`
- [x] Tooltip dismissible with Escape (WCAG 1.4.13)
- [x] Sidebar toggle exposes `aria-expanded` + `aria-controls`
- [ ] Arrow-key navigation on top-level links (not implemented — links are
      plain anchors; this is acceptable per APG "disclosure navigation"
      guidance, since Tab order is short and linear)
- [ ] Mobile marketing menu focus management (moot — menu is unreachable)
