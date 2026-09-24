# Recipient title count-badge specification

## Summary

The recipient portal should expose a lightweight document-title badge only when the tab is not focused and there are pending withdrawable streams. The pattern mirrors the same underlying count source used by the page’s withdrawable-stream state so it stays consistent with the UI.

## Title format

The document title should follow this pattern:

- Focused tab or zero pending streams: `Fluxora — Recipient portal`
- Blurred tab with one pending stream: `(1) Fluxora — Recipient portal`
- Blurred tab with 2–9 pending streams: `(N) Fluxora — Recipient portal`
- Blurred tab with 10 or more pending streams: `(9+) Fluxora — Recipient portal`

This keeps the count badge compact and predictable while avoiding a long title string in the browser tab.

## Interaction and state rules

1. The badge is only applied while the page is blurred.
2. The badge is removed immediately when the tab regains focus.
3. When the count reaches zero while the tab is blurred, the title reverts to the clean title without a lingering badge.
4. The title is reset on unmount to avoid leaving a stale badge behind when the user leaves the page.

## Accessibility notes

- The title change only occurs while the tab is blurred, so screen-reader users who are actively focused on the page are not interrupted by repeated title announcements.
- The badge is informational and does not introduce a keyboard trap or any new interactive element.
- The count source is the same data used by the withdrawable-stream UI, so the badge reflects the current page state rather than an independent or stale counter.

## Coexistence with the favicon badge

The document-title badge and any future favicon count badge should read from the same underlying stream-count source (the recipient page’s pending withdrawable-stream count). This keeps both affordances synchronized and makes the behavior easy to review and maintain.

## Engineering notes

- The count is derived from active streams with a positive withdrawable balance and a valid withdraw stream id.
- The title update should be implemented in the recipient page component so the count source and title behavior stay in one place.
- The implementation should avoid any live-region-like announcements; title changes are passive and only triggered by focus state.

## Verification checklist

- Confirm the title is clean when the tab is focused.
- Confirm the title becomes `(N) Fluxora — Recipient portal` when the tab is blurred and there are pending streams.
- Confirm the title reverts to the clean title when the count reaches zero while blurred.
- Confirm the page does not introduce a keyboard trap or other interaction regression.
