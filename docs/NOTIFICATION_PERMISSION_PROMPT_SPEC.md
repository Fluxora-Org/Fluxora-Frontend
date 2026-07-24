# Stream-Status Notification Permission Prompt

## Intent

Fluxora remains fully usable with in-app `ToastNotification` feedback. Browser
notifications are a contextual enhancement and are never requested on page
load, wallet connect, or data refresh. The native permission dialog can only be
opened after the user activates `Notify me` and then confirms the in-app
priming screen with `Allow stream alerts`.

## States

| State | UX |
| --- | --- |
| not-yet-asked | Recipient page shows optional “Know when your stream changes” panel and `Notify me`; no browser API call has occurred. |
| priming-shown | Keyboard-operable dialog explains the exact milestones and previews the notification. `Not now` closes it without changing browser permission. |
| permission-granted | Local Fluxora alert preference is on; the control becomes `Alerts on · Turn off`. Browser notifications use the template below. |
| permission-denied | The dialog closes and an in-app polite toast explains that no permission was granted. |
| permission-denied-recovery-hint | The page explains that browser site settings must be changed before retrying, then `Notify me` can be used again. |

Turning alerts off later changes Fluxora's local preference only. Browser-level
permission is controlled by the browser's site settings and is never
misrepresented as revoked by the app.

## Notification contract

| Milestone | Title | Body | Icon |
| --- | --- | --- | --- |
| Cliff passed | `Cliff passed` | `The cliff for {stream} has passed. Accrual is now available.` | `/fluxora-notification-icon.svg` |
| Fully accrued | `Stream fully accrued` | `{stream} is fully accrued and ready to withdraw.` | `/fluxora-notification-icon.svg` |
| New stream | `New stream received` | `You have received {stream} in Fluxora.` | `/fluxora-notification-icon.svg` |

`getStreamStatusNotificationContent()` in `ToastNotification.tsx` is the
single content contract for future browser notifications and in-app previews.
The icon path reuses Fluxora branding and must be supplied as a 1:1 bitmap or
mask-safe asset in the public bundle before production notification delivery.

## Accessibility and responsive behavior

The priming surface is a real `role="dialog"` with a labelled heading,
description, explicit buttons, visible focus rings, and no dependency on the
native browser dialog for its accessible explanation. `Not now` and
`Allow stream alerts` are reachable before any native prompt appears. The
mobile layout stacks actions at 600px and keeps a 44px minimum target size.

The light-theme priming text `#1a1f36` on `#ffffff` measures 16.58:1; muted
text `#4a5565` on `#ffffff` measures 7.16:1; accent button `#ffffff` on
`#007f68` measures 5.05:1. The dark-theme equivalents `#e8ecf4` on `#0a0e17`,
`#b0b8c9` on `#0a0e17`, and `#04131a` on `#00b890` measure 15.15:1, 10.83:1,
and 8.88:1 respectively. Focus indicators use the existing high-contrast
focus tokens and exceed the 3:1 non-text requirement.

## Redlines and review checklist

- Redline A: optional alert panel sits below recipient summary, never above
  the first stream or on page load as a blocking prompt.
- Redline B: priming dialog lists exactly three triggers; no vague “stay
  updated” copy and no native permission request on dialog open.
- Redline C: granted state exposes a local off control; denied state exposes a
  browser-settings recovery hint.
- Verify keyboard order: `Notify me`, dialog `Not now`, then `Allow stream
  alerts`; Tab and Enter remain available after commit.
- Verify at narrow widths that the dialog actions stack and do not collide
  with `InfoTooltip` popovers or the OS-owned permission/candidate surfaces.
- Capture annotated desktop and mobile screenshots for all five states in the
  PR. This repository implementation includes written redline annotations;
  screenshot capture remains a release-review step.