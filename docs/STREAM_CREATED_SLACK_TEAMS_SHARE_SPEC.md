# Stream-created Slack / Teams share integration

Hand-off specification for the “Share to Slack / Teams” experience in
[`src/components/Streams/StreamCreatedModal.tsx`](../src/components/Streams/StreamCreatedModal.tsx),
connection persistence in [`src/lib/shareWorkspaces.ts`](../src/lib/shareWorkspaces.ts),
and the connected-workspace indicator in
[`src/components/navigation/WalletStatus.tsx`](../src/components/navigation/WalletStatus.tsx).

Issue: Fluxora-Org/Fluxora-Frontend#1015.

---

## Goal

Extend the stream-created success modal beyond copy-link / view-stream so a
sender can post a formatted stream summary card (recipient, rate, cliff, link)
to a connected Slack or Microsoft Teams channel, including first-time OAuth
connect and later disconnect from the wallet menu.

---

## Placement

| Surface | Affordance |
| --- | --- |
| `StreamCreatedModal` | “Share with your team” region below Next steps, above receipt preview |
| `WalletStatus` dropdown | Connected workspace chips + Connect / Disconnect actions |

---

## Share button group

- Region: `role="region"` / `aria-label="Share stream"`.
- Heading: `h3` — “Share with your team”.
- Group: `role="group"` / `aria-label="Share to messaging apps"`.
- Buttons: **Share to Slack**, **Share to Teams** (equal-width; stack ≤480px).
- Active provider uses `.shareButtonActive` (cyan border / tint).
- Minimum target size: 44×44px.

---

## Flow states

| State | Trigger | UI |
| --- | --- | --- |
| `idle` | Modal open / provider cleared | Button group only; no picker |
| `not-connected` | Provider selected, no stored OAuth | Connect CTA + short privacy copy |
| `connecting` | User activates Connect | Disabled buttons, `aria-busy`, “Connecting to {provider}…” live text |
| `connected-channel-picker` | OAuth mock succeeds | Combobox + preview card + Send |
| `sending` | User activates Send | Send disabled / busy; badge “Sending…” |
| `sent` | Post mock succeeds | Badge “Sent”; success toast |
| `send-failed` | Post mock fails | Inline alert + error toast; Send retries |

State machine (happy path):

```
idle → not-connected → connecting → connected-channel-picker → sending → sent
                                         ↑                        |
                                         └────── (retry) ← send-failed
```

If the provider is already connected when selected, skip straight to
`connected-channel-picker`.

---

## Channel picker (combobox)

- Label: “Channel” via visible `<label htmlFor="…">`.
- Control: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`.
- Listbox: `role="listbox"` with `role="option"` items; `aria-activedescendant` for highlight.
- Keyboard:
  - Type to filter channel names (case-insensitive contains).
  - `ArrowDown` / `ArrowUp` move highlight; `Enter` selects; `Escape` closes list.
  - Entire flow (connect → pick → preview → send) is Tab / Enter / Space reachable.
- Empty filter: “No channels match” polite status (not an option).

---

## Message preview card

Marked up as an article with correct heading levels:

```
article.sharePreviewCard
  h4#share-preview-heading  Message preview
  dl
    dt Recipient / dd {recipient}
    dt Rate / dd {rate}
    dt Cliff / dd {cliff}
    dt Stream link / dd <a href={streamUrl}>
```

Badge text maps to flow state (`Ready to share` | `Sending…` | `Sent` | `Send failed`).

Card payload contract (future API):

```json
{
  "title": "New Fluxora stream",
  "recipient": "GCD...RECIPIENT",
  "rate": "0.0261 USDC/sec",
  "cliff": "None",
  "url": "https://fluxora.io/stream/STR-123"
}
```

---

## OAuth connect / disconnect

### First-time connect (modal)

1. User chooses Slack or Teams while disconnected → `not-connected`.
2. **Connect {provider}** simulates popup OAuth (design mock; replace with real redirect).
3. On success, workspace is written to `localStorage` key `fluxora-share-workspaces`
   via `connectWorkspace()` and the UI advances to channel picker.

### Account indicator (`WalletStatus`)

- When connected: compact badges “Slack · {workspace}” / “Teams · {workspace}”.
- Menu items:
  - **Connect Slack / Teams workspace** when disconnected.
  - **Disconnect Slack / Teams** when connected (clears only that provider).
- Live region announces connect / disconnect outcomes.

Engineering note: real OAuth must open the provider authorize URL, store tokens
server-side, and never persist refresh tokens in `localStorage`. The current
client store is a design stand-in only.

---

## Toast feedback (`ToastNotification` variants)

| Outcome | Variant | Message |
| --- | --- | --- |
| Sent | `success` | `Stream summary shared to {channel} on {provider}.` |
| Send failed | `error` | `Could not share to {provider}. Try again.` |
| Connected | `success` | `{provider} workspace connected.` |
| Disconnect | `info` | `{provider} workspace disconnected.` |

Toasts reuse `useOptionalToast().addToast`. Modal also mirrors critical status
in the existing assertive live region.

---

## Design tokens & contrast (WCAG 2.1 AA)

| Element | Dark theme | Contrast notes |
| --- | --- | --- |
| Share button text `#e8ecf4` on `#141e30` | ≥ 11:1 | Meets 4.5:1 |
| Share button text on light skin `#1a1f36` on `#f4f6f9` | ≥ 12:1 | Meets 4.5:1 |
| Active border `#00b8d4` | ≥ 3:1 non-text | Focus / selection |
| List option hover `#e8ecf4` on `#1e2d42` | ≥ 9:1 | Meets 4.5:1 |
| Status badge `#8ec5ff` on `#0d1421` | ≥ 7:1 | Meets 4.5:1 |
| Error alert `#fca5a5` on dark panel | ≥ 4.5:1 | Meets AA |

Focus rings reuse the modal dual-ring pattern (`#0d1421` gap + `#00b8d4` /
cyberpunk yellow). Cyberpunk skin inherits share styles via existing
`.cyberpunkSkin` overrides where needed.

---

## Redlines (annotated)

**Desktop modal (~560px)**

```
┌──────────────────────────────────────────────┐
│  [×]                                         │
│           Stream created!                    │
│           … success copy …                   │
│  ┌ stream id / url / copy ┐                  │
│  ┌ Next steps … ┐                            │
│  Share with your team                        │  ←16px above group
│  ┌─────────────┐ ┌─────────────┐             │
│  │ Share Slack │ │ Share Teams │  gap 12px   │
│  └─────────────┘ └─────────────┘             │
│  Channel [  payroll          ▾ ]             │  ← labeled combobox
│  ┌ Message preview ──────── Sent ──┐         │
│  │ Recipient  GCD…                 │         │
│  │ Rate       0.0261 USDC/sec      │         │
│  │ Cliff      None                 │         │
│  │ Link       https://…            │         │
│  └─────────────────────────────────┘         │
│              [ Send to channel ]             │
│  … receipt …                                 │
│  [ Create another ] [ View stream ]          │
└──────────────────────────────────────────────┘
```

**Mobile (≤480px)**

- Share buttons stack full-width.
- Combobox and preview card use 100% modal content width (padding 1.5rem).
- Send remains full-width; 44px min height.

**WalletStatus menu**

```
┌ Wallet options ─────────────┐
│ Copy address                │
│ View in explorer            │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ Slack · Fluxora HQ          │  ← status only when connected
│ Disconnect Slack            │
│ Connect Microsoft Teams     │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ Disconnect                  │
└─────────────────────────────┘
```

Screenshot capture of each state remains a release-review step; this document
is the annotated redline source of truth for engineering hand-off.

---

## Accessibility checklist

- [x] Channel picker is a labeled combobox with keyboard filtering.
- [x] Preview uses `h3` (section) → `h4` (preview) heading order inside the dialog.
- [x] Connect / Send / Disconnect expose busy and disabled states.
- [x] Failure uses `role="alert"` inline plus error toast.
- [x] Focus never trapped outside the existing modal focus scope.
- [x] `prefers-reduced-motion`: no required motion beyond optional spinner.

---

## Testing plan

1. Unit: button group renders; selecting Slack while disconnected shows Connect.
2. Unit: connect advances to combobox; filtering narrows options; selecting sets value.
3. Unit: Send success → `sent` + success toast; forced failure → `send-failed` + error toast.
4. Unit: `WalletStatus` shows connected badge and disconnect clears storage.
5. Manual: contrast spot-check both themes; keyboard-only walkthrough; 375px layout.

---

## Engineering hand-off summary

| Deliverable | Path |
| --- | --- |
| Modal UX | `src/components/Streams/StreamCreatedModal.tsx` |
| Styles | `src/components/Streams/StreamCreatedModal.module.css` |
| Workspace store (mock) | `src/lib/shareWorkspaces.ts` |
| Account indicator | `src/components/navigation/WalletStatus.tsx` |
| Spec | `docs/STREAM_CREATED_SLACK_TEAMS_SHARE_SPEC.md` |
| Tests | `src/components/Streams/__tests__/StreamCreatedModal.share.test.tsx` |

Replace `connectWorkspace` / simulated send with real OAuth + messaging APIs
without changing the state names or toast copy contracts above.
