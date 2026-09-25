# Privacy-Conscious Address Display Spec
**Issue:** Privacy-conscious display: masking and reveal patterns for addresses  
**Branch:** `privacy-address-masking-patterns`  
**Status:** Ready for engineering handoff  
**Audience:** Product, Design, Engineering, QA  
**Last Updated:** April 29, 2026

---

## 1. Scope

Fluxora shows Stellar addresses in navigation, treasury stream tables, stream details, recipient views, and create-stream confirmation flows. This spec defines one consistent contract for masking, revealing, copying, and linking addresses without exposing full wallet identifiers by default.

### In scope

| Surface | Current examples | Required treatment |
|---|---|---|
| App navigation wallet status | `WalletStatus`, `AppNavbar`, `Walletbutton` | Masked pill, full address only inside explicit reveal panel |
| Treasury overview streams | `StreamRow`, `RecentStreams` | Masked recipient address with copy and explorer affordances |
| Streams list/detail | `Streams.tsx` | Masked by default; selected details allow controlled reveal |
| Recipient portal | `RecipientStreams`, `Recipient.css` | Masked sender/treasury address; no full address in table cells |
| Create stream review/success | `CreateStreamModal`, `StreamCreatedModal` | Full address hidden behind reveal; copy remains available |

### Out of scope

- Changing wallet connection logic or network detection.
- Encrypting addresses, access control, or chain-level privacy.
- Replacing Stellar explorer URLs.
- Name service resolution or human-readable aliases.

---

## 2. User Goals

| User | Goal | Why it matters |
|---|---|---|
| Treasury operator | Verify the destination address before funding a stream without leaving full addresses exposed on shared screens. | Prevents payment mistakes while reducing incidental disclosure. |
| Recipient | Confirm incoming streams are associated with the expected treasury without exposing counterparties in a public workspace. | Builds confidence while respecting operational privacy. |
| Auditor | Inspect address identity when needed and copy exact values for reconciliation. | Supports audit trails without making the default view noisy. |
| Support/admin | Ask users for masked address references in screenshots. | Makes screenshots safer to share in tickets and chat. |

---

## 3. Primary Tasks

1. Identify a wallet or counterparty at a glance from a masked address.
2. Copy the exact full address with one deliberate action.
3. Temporarily reveal the full address for verification.
4. Open the correct Stellar explorer page.
5. Share screenshots that do not expose full addresses by default.

---

## 4. Success Metrics

| Metric | Target | Measurement |
|---|---:|---|
| Default full-address exposure | 0 full addresses visible outside focused reveal states | QA screenshot audit across app routes |
| Copy completion | 95% of tested copy actions write the full address, not the masked string | Unit/integration tests with clipboard mock |
| Verification confidence | 90% of usability testers can confirm first 6 and last 6 characters before sending | Moderated create-stream task |
| Reveal reversibility | 100% of reveal states can be hidden by the original control, Escape, or blur/menu close where applicable | Keyboard QA |
| Accessibility | WCAG 2.1 AA for focus, name, role, value, contrast, and target size | Automated checks plus keyboard pass |

---

## 5. Address Masking Rules

### Display formats

| Context | Format | Example | Notes |
|---|---|---|---|
| Compact pills and table cells | `first 6 + ... + last 6` | `GDU4D7...K92QXA` | Default for Stellar account IDs. |
| Tight mobile cells below 360px | `first 4 + ... + last 4` | `GDU4...QXA9` | Only when layout cannot fit 6/6 without wrapping. |
| Review screens with more room | `first 8 + ... + last 8` | `GDU4D7EX...N3K92QXA` | Helps final verification before signing. |
| Invalid or missing address | `Address unavailable` | `Address unavailable` | Do not show partial malformed strings. |
| Already-short values <= 16 chars | Show as provided | `demo-id-01` | Used only for demo IDs, never real Stellar account IDs. |

### Character rules

- Use the literal ASCII ellipsis string `...`, not a single ellipsis glyph, to match existing code and avoid font fallback issues.
- Preserve case exactly.
- Never insert spaces inside the address string.
- The visual value may wrap only at the separator. Prefer `white-space: nowrap` in pills and `overflow-wrap: anywhere` only in full reveal panels.
- The copy action always copies the full canonical address.

### Validation assumptions

Stellar account IDs are expected to start with `G` and be 56 characters. Masking must not be used as validation. Invalid values should be rejected at input boundaries and shown as unavailable on read-only surfaces.

---

## 6. Interaction Contract

### Default state

- Address is masked.
- Adjacent actions are icon buttons where space allows: Copy, Reveal, Explorer.
- The masked text itself is not a copy button unless the surface is a compact wallet pill with an attached dropdown.
- Hover may slightly raise border contrast, but must not reveal characters.

### Reveal state

- Reveal is always user-initiated through a button labelled for assistive tech.
- Revealed content appears in a bounded panel, popover, or expanded detail row, not directly in dense table cells.
- Reveal persists only within the current surface. It must reset on route change, menu close, modal close, successful stream creation, or wallet disconnect.
- Escape closes popovers and hides revealed addresses.
- Copying a revealed address does not automatically keep it revealed.

### Copy state

- Copy button has immediate visual feedback: icon changes from copy to check and label changes from `Copy address` to `Copied`.
- Feedback duration: 1.5 seconds.
- Failure state: show non-blocking toast or inline message, `Clipboard access is unavailable. Copy manually from the revealed address.`
- Copy must be available even when the address is masked.

### Explorer state

- Explorer opens in a new tab with `noopener,noreferrer`.
- Network path comes from the active network when known: `public` or `testnet`.
- If network is unknown, use testnet only on demo data; otherwise require the caller to pass a network.

---

## 7. Annotated Frames

### Frame A: Navigation wallet pill

```
--------------------------------------------------------------
Fluxora                              Testnet  * GDU4D7...K92QXA v
--------------------------------------------------------------
                                      1   2
```

Annotations:

| # | Element | Spec |
|---|---|---|
| 1 | Connected indicator | 8px status dot, green for connected, hidden from screen readers. |
| 2 | Masked wallet button | Opens menu. Accessible name: `Wallet GDU4D7...K92QXA. Open wallet options.` |

Menu opened:

```
-----------------------------
GDU4D7...K92QXA
[eye] Reveal full address
[copy] Copy address
[external] View in explorer
-----------------------------
[log-out] Disconnect
-----------------------------
```

When revealed, replace the first row with a mono full-address block and a `Hide address` action. The full block may wrap and must be selectable.

### Frame B: Treasury streams table

```
------------------------------------------------------------------
Stream         Recipient                         Rate      Status
------------------------------------------------------------------
Core grant     Alice M.                          250/day   Active
STR-1024       GABC9D...W91KLM [copy] [external]
------------------------------------------------------------------
```

Annotations:

| Element | Spec |
|---|---|
| Recipient label | If a display name exists, show it first in body text. |
| Masked address | Mono 12px, secondary text color, one line on desktop. |
| Copy icon | Copies full address. Accessible name: `Copy recipient address for Alice M.` |
| Explorer icon | Opens explorer. Accessible name includes network when known. |

### Frame C: Stream detail reveal

```
Recipient
Alice M.
GABC9D...W91KLM  [copy] [reveal] [explorer]

Expanded after reveal:
------------------------------------------------
Full recipient address
GABC9D7EXAMPLEADDRESS...FULL56CHARVALUE
[hide] [copy]
------------------------------------------------
```

Annotations:

| Element | Spec |
|---|---|
| Reveal trigger | Button label: `Reveal full recipient address`. |
| Full address panel | `role="region"` with `aria-label="Full recipient address"`. |
| Hide trigger | Returns to masked-only state and focus remains on Hide/Reveal control. |

### Frame D: Create stream review

```
Review stream
Recipient address
GDU4D7EX...N3K92QXA       [copy] [reveal]

[Back]                         [Create stream]
```

Annotations:

| Element | Spec |
|---|---|
| Review mask | Uses 8/8 format for stronger pre-signing verification. |
| Reveal placement | Revealed full address appears directly below the field label, inside the review card. |
| Submit behavior | Revealed addresses do not alter validation or payload. |

---

## 8. Component Spec

### `AddressDisplay`

```tsx
type AddressDisplayVariant = "pill" | "inline" | "table" | "review" | "detail";

interface AddressDisplayProps {
  address: string | null | undefined;
  label?: string;
  network?: "PUBLIC" | "TESTNET" | "public" | "testnet";
  variant?: AddressDisplayVariant;
  revealable?: boolean;
  copyable?: boolean;
  explorerLink?: boolean;
  ownerLabel?: string;
  onCopy?: (address: string) => void;
  onRevealChange?: (revealed: boolean) => void;
}
```

### Behavior by variant

| Variant | Mask | Reveal pattern | Typical surface |
|---|---|---|---|
| `pill` | 6/6 | Dropdown row expands to full block | Navigation wallet |
| `inline` | 6/6 | Popover below text | Small metadata rows |
| `table` | 6/6 desktop, 4/4 mobile | No inline full reveal; open detail or popover | Treasury/recipient tables |
| `review` | 8/8 | In-card full block | Create stream review |
| `detail` | 6/6 | Persistent expanded panel | Stream detail page |

### Visual tokens

| Token | Value |
|---|---|
| Address font | `var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace)` |
| Masked text size | `12px / 16px` |
| Full address text size | `12px / 18px` |
| Pill height | `36px` desktop, `44px` touch target minimum |
| Icon button target | `32px` visual, `44px` hit target where possible |
| Border | `1px solid var(--color-border-default, var(--border))` |
| Focus ring | Existing global focus ring or `2px solid var(--color-focus)` |
| Revealed panel background | `var(--color-surface-elevated, var(--surface))` |
| Revealed panel radius | `8px` |

### Required icons

Use `lucide-react` icons already present in the codebase:

| Action | Icon |
|---|---|
| Copy | `Copy` |
| Copied | `Check` |
| Reveal | `Eye` |
| Hide | `EyeOff` |
| Explorer | `ExternalLink` |
| Disconnect | `LogOut` |

---

## 9. Accessibility

| Requirement | Acceptance note |
|---|---|
| Keyboard access | All reveal, copy, explorer, and menu controls reachable by Tab and activatable by Enter/Space. |
| Focus management | Opening a dropdown keeps focus on trigger; reveal panels do not steal focus unless opened from a menu item that expands content in place. |
| Screen reader labels | Masked text has an explicit label, e.g. `Recipient address GABC9D...W91KLM`. Full address is announced only when revealed. |
| Live feedback | Copy success uses `aria-live="polite"` text or existing toast semantics. |
| Menu semantics | Wallet dropdown uses `aria-haspopup="menu"`, `aria-expanded`, `role="menu"` and `role="menuitem"` for actions. |
| Reduced motion | No reveal animation required; if used, respect `prefers-reduced-motion`. |
| Contrast | Masked and full address text must meet 4.5:1 against surface backgrounds. |

---

## 10. Edge Cases

| Edge case | Expected behavior |
|---|---|
| `address` is null, undefined, empty, or whitespace | Render `Address unavailable`; hide copy, reveal, and explorer actions. |
| Address fails Stellar account shape | Render `Address unavailable` in production data views; log only through existing error reporting if available. |
| Demo data is already masked | Render as text and disable reveal; copy copies the available demo value only if explicitly marked demo-safe. |
| Clipboard API unavailable | Show failure message and offer reveal if `revealable=true`. |
| Very narrow mobile table | Use 4/4 mask and hide explorer behind row detail menu if icons crowd content. |
| Multiple identical addresses in one table | Each copy/reveal control includes row owner in accessible label. |
| Network unknown | Hide explorer action unless the surface has an explicit safe default. |
| Wallet disconnects while menu is open | Close menu, clear revealed state, remove address from DOM. |
| Route changes | Clear all revealed states. |
| Print or screenshot mode | Masked state remains the default; no automatic reveal for print CSS. |

---

## 11. Engineering Acceptance Criteria

- No route renders a real full Stellar account address by default.
- Shared formatting helper returns stable masks for 4/4, 6/6, and 8/8 patterns.
- Copy buttons copy full addresses when the full address is available.
- Reveal controls are opt-in per surface and reset on close/unmount.
- Wallet status, stream tables, stream detail, recipient portal, and create-stream review use one shared `AddressDisplay` API or a shared formatting/action helper.
- Existing demo masked strings do not cause malformed explorer URLs.
- Keyboard and screen reader behavior passes the accessibility notes above.
- Tests cover masking helper, null/malformed values, copy behavior, and reveal toggling.

---

## 12. QA Checklist

- Visit `/app/dashboard`, `/app/streams`, `/app/recipient`, and `/connect-wallet` with a connected wallet fixture.
- Confirm every address starts masked.
- Confirm full address appears only after pressing a reveal control.
- Confirm Escape or close action hides revealed content in menus/popovers.
- Confirm copying from masked state writes the full address.
- Confirm copied feedback clears after 1.5 seconds.
- Confirm explorer links include the right `public` or `testnet` path.
- Confirm mobile width at 320px has no horizontal scroll from address text.
- Confirm screenshots of default states contain no full addresses.

---

## 13. Deferrals

| Deferral | Rationale |
|---|---|
| Address book aliases | Requires data model and trust decisions beyond this visual contract. |
| Per-user privacy preferences | Needs persistence and settings UX; this task defines safe defaults first. |
| ENS/Stellar name service support | Name resolution can create spoofing risks without verification states. |
| Role-based reveal permissions | Requires authorization model and backend enforcement. |
| Audit export redaction settings | Export behavior is a separate workflow with different compliance needs. |
| Anti-phishing checksum visualization | Valuable, but should be designed with validation and education together. |
