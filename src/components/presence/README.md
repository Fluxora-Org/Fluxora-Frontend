# Presence Badge

The `PresenceBadge` component and its associated hooks (`usePresenceViewers`) manage the display of real-time viewer presence in a stream.

## Refresh Cadence & Polling Flow

- **Polling/Timers:** Polling logic is handled by the `usePresenceViewers` hook. An internal timer checks viewer `lastSeen` timestamps every 1 second.
- **Fade Out (29s):** If a viewer hasn't been active for 29 seconds, they are marked with `fadingOut: true`. This triggers CSS animations (`.fading-out` class in `Presence.css`) to gradually hide their avatar.
- **Eviction (30s):** If a viewer hasn't been active for 30 seconds, they are completely removed from the `viewers` array.

## Subscription Lifecycle & Cleanup (Issue #1428)

`usePresenceViewers` owns a single presence subscription — the eviction
interval today, and a real transport listener once wired — scoped to the
`(streamId, accountId)` tuple:

- **Route change (`streamId`)** and **account switch (`accountId`)**: the
  previous subscription is torn down (its `clearInterval` cleanup runs) BEFORE a
  fresh one is established, and any stale viewer state is reset to `[]`
  synchronously so a prior route or wallet identity cannot leak through.
- **Wallet disconnect (`accountId` → `undefined`) or leaving a stream
  (`streamId` → `undefined`)**: with no remaining viewer source the subscription
  is torn down entirely and viewers reset to `[]`.
- **Unmount**: the interval is cleared and a `mounted` guard makes any late tick
  a no-op, so no state update occurs after unmount.

Before this change the eviction interval was created once on mount and ran
unconditionally for the component's lifetime, regardless of the active route or
wallet identity. It is now created only while a viewer source exists and is
rebound whenever the route or identity changes.

## Edge Cases & State Management

- **Empty State:** If there are 0 other viewers (`viewers.length === 0`), the component returns `null` and renders nothing. This implicitly handles "loading" or "empty" states before viewers join.
- **Loading / Retry:** Currently, there is no explicit visual loading skeleton or retry button in `PresenceBadge`. If the transport fails or is unconfigured, the hook sets `presenceStatus` to `"unavailable"`, returning `viewers = []`, which gracefully renders nothing.
- **Keyboard Navigation:** The badge trigger is a `<button>` mapped to Enter/Space natively. The expanded list can be closed by clicking outside or pressing `Escape`. Focus is returned to the trigger upon closing.
- **Responsive States:** The component relies on CSS media queries. On mobile screens (`max-width: 767px`), the avatar stack `.presence-avatar-stack` is hidden, and the badge condenses to just the viewer count. The hover tooltips (`.presence-tooltip`) also degrade gracefully to touch interactions.
- **Accessibility (a11y):** The component uses an `aria-live="polite"` region to announce when viewers join or leave. To prevent spamming, cursor movements do not trigger announcements.

## Expected Regression Surface

When making changes to this component or its hooks, ensure that:
1. **Empty Rendering:** 0 viewers continue to render `null` without crashing.
2. **Timer Accuracy:** The 29s fade-out and 30s eviction logic in `usePresenceViewers` is preserved.
3. **Focus Trap / Escape:** Keyboard usability remains intact; pressing `Escape` from the dropdown list must close the list and return focus to the trigger button.
4. **Mobile Layout:** The avatar stack remains hidden on narrow viewports to avoid overlapping other critical UI.
5. **A11y Regions:** Screen reader announcements only trigger on join/leave events, not on passive `lastSeen` updates.
