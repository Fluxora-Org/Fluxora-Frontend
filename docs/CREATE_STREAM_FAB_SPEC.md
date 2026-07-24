# Create-stream FAB specification

## Goal

Provide a persistent create entry point on `Streams` and `Dashboard` so the action remains available while long stream lists scroll. The FAB is a secondary entry point; existing inline and empty-state actions remain for discoverability and contextual workflows.

## States

| State | Appearance and behavior |
| --- | --- |
| Collapsed | 56px minimum hit target, pill-shaped on desktop with `+ Create stream`, circular icon-only presentation below 480px. Uses `.ui-primary-cta`, `--shadow-lg`, and the primary CTA background/text tokens. |
| Hover | Primary CTA hover background and elevated CTA shadow; moves up 2px without changing layout. |
| Focus | Existing global dual-layer focus ring; the ring must remain visible against both the CTA and page surface. |
| Pressed | Primary active background and 1px downward movement. |
| Expanded | Optional speed dial above the main button. The main icon rotates 45 degrees and its label changes to `Close`. Secondary actions are 44px minimum menu items on the page surface with `--shadow-lg`. |
| Hidden — modal open | Not rendered while `CreateStreamModal` is open (and while the success modal is open on Streams) to avoid duplicate entry points and accidental clicks behind the dialog. |
| Disabled — wallet disconnected | Rendered but disabled on Dashboard until the wallet is connected. The accessible name explains that the wallet must be connected first. Streams currently has a connected wallet source, so its FAB is enabled. |

## Position and collision avoidance

- The FAB is `position: fixed`, so it is independent of list scroll position.
- Desktop position is 24px from the inline and block edges (`--fab-side-offset` and `--fab-bottom-offset`).
- At widths up to 860px, the block offset is 88px (`--fab-bottom-offset-mobile`) to clear the mobile bottom-navigation safe area. `env(safe-area-inset-*)` is included for devices with a home indicator.
- `--fab-z-index: 900` keeps the action above page content but below modal layers and drawer overlays. The mobile sidebar/drawer remains the higher-priority interaction.
- The streams page retains normal document flow; the fixed control never changes pagination layout. The 88px mobile clearance leaves the pagination controls in the document flow and prevents the FAB from sitting on the bottom navigation region.

## Expanded speed dial

Quick-create is not shipped yet, so both production pages use the collapsed single-action form. The component accepts `actions` for the planned `Create stream` / `Import CSV` variant. When present:

- The trigger exposes `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`.
- On expansion, focus moves to the first `menuitem`.
- `ArrowDown` / `ArrowUp` cycle through items; `Home` / `End` jump to the first/last item; `Escape` collapses the menu.
- Selecting an item invokes its action and collapses the menu.

## Accessibility and verification

- The button is a native `<button>` with a minimum 56px target; speed-dial items are at least 44px high.
- The icon is decorative and the accessible name is supplied by the button label.
- The disabled state is a real `disabled` button, not just a visual treatment.
- Keyboard walkthrough: Tab reaches the collapsed FAB, Enter/Space activates it; with actions, Tab/Enter expands it and arrow keys move between menu items.
- `prefers-reduced-motion: reduce` disables FAB transforms and icon transitions.
- The primary CTA text token (`--color-cta-primary-text: #04131a`) against the primary background (`--color-cta-primary-bg: #00b8d4`) is used in both light and dark themes. This combination is above the 4.5:1 normal-text target; verify the exact deployed theme values with the contrast checker during visual review.

## Redline / screenshot checklist

Capture at 375px, 768px, and 1440px in both themes with these annotations:

1. 56px button diameter/height and 24px desktop edge offsets.
2. 88px mobile bottom clearance plus safe-area inset.
3. Focus ring outer edge and label/icon alignment.
4. Expanded menu vertical gap and 44px menu item height (when quick-create actions are enabled).
5. Modal-open screenshot showing the FAB absent.
6. Long-list and pagination screenshot showing the FAB fixed while content scrolls.

The component's token values and responsive rules are in [src/design-tokens.css](../src/design-tokens.css); use the checklist above as the PR redline overlay rather than embedding generated screenshots in source control.
