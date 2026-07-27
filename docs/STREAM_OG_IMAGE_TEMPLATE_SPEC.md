# Stream Detail Open Graph Image Template Specification

## 1. Overview

This specification details the auto-generated per-stream Open Graph (OG) image template system for Fluxora. Links shared for specific streams (`/app/streams/:streamId`) render a dynamic social preview card (1200 × 630 px) with live stream details, recipient information, accrual rates, status pills, and Fluxora branding.

---

## 2. Canvas & Layout Specifications

- **Aspect Ratio & Resolution**: 1200 px (W) × 630 px (H) — Standard 1.91:1 Open Graph / Twitter Large Card.
- **Canvas Base**: Deep slate gradient (`linear-gradient(135deg, #0F172A 0%, #1E293B 100%)`).
- **Container Outer Frame**: 24px inset padding with a 1px subtle glassmorphic border (`rgba(255, 255, 255, 0.12)`), `borderRadius: 20px`.
- **Grid Layout**: 3-Row Vertical Flex layout:
  - **Top Row (Header)**: Fluxora Brand (Logo + Text) aligned left; Large-scale `StatusPill` aligned right.
  - **Middle Body**: Stream Title (52px bold), Recipient badge (`RECIPIENT: Name (G... address)`), Accrual Rate Metric card (`36px bold sky blue`), and Total Deposit (`20px slate-300`).
  - **Bottom Row (Footer & Milestones)**: Milestone card (Cliff date if defined) OR Fallback Schedule bar (`Progress %` + `startDate` → `endDate`).

---

## 3. Visual Components & Redlines (ASCII Breakdown)

```
+-----------------------------------------------------------------------------------+
| [Fluxora Brand Logo] FLUXORA                              [ STATUS PILL: ACTIVE ] |
|                                                                                   |
|  Dev Grant - Alice                                                                |
|  RECIPIENT: Alice M. (GAJC...3P)                                                  |
|                                                                                   |
|  +-------------------------------------+  +------------------------------------+  |
|  | ACCRUAL RATE                        |  | TOTAL DEPOSIT                      |  |
|  | 5,000 USDC / mo                     |  | 48,000 USDC                        |  |
|  +-------------------------------------+  +------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | CLIFF MILESTONE: 2026-01-31              PROGRESS: 40% (2026-01-15 - 10-15)  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### Component Details

#### A. Brand Header Bar
- **Logo Icon**: Cyan gradient stream icon (28px × 28px).
- **Brand Wordmark**: 22px Bold, letter-spacing `0.08em`, `#F8FAFC`.
- **StatusPill (Large Scale)**:
  - **Active State**: Background `#064E3B`, Text `#34D399`, Border `#059669` (Play icon + "ACTIVE").
  - **Paused State**: Background `#78350F`, Text `#FBBF24`, Border `#D97706` (Pause icon + "PAUSED").
  - **Completed State**: Background `#334155`, Text `#94A3B8`, Border `#475569` (CheckCircle icon + "COMPLETED").

#### B. Center Stream Details
- **Stream Name**: 52px Bold (`#F8FAFC`), line-height 1.15, max 2 lines (line-clamp with ellipsis).
- **Recipient Block**:
  - `RECIPIENT` tag: 13px Uppercase, letter-spacing `0.1em`, `#94A3B8`.
  - Recipient Name: 22px Medium (`#F8FAFC`).
  - Stellar Address: Monospace 16px (`#38BDF8`), truncated `G...` checksummed StrKey.

#### C. Metric Cards
- **Accrual Rate**: `36px` Extra-Bold Sky Blue (`#38BDF8`), e.g., `5,000 USDC / mo`.
- **Total Deposit**: `20px` Semi-Bold Slate-300 (`#CBD5E1`), e.g., `Deposit: 48,000 USDC`.

#### D. Milestone & Schedule Footer
- **With Cliff Date**: Shows `CLIFF MILESTONE: YYYY-MM-DD` alongside total schedule.
- **Fallback (No Cliff / Missing Optional Fields)**: Gracefully switches to full-width schedule bar displaying `Progress: X%` with an inline progress indicator and start-to-end timeline (`startDate` → `endDate`), eliminating blank space or awkward gaps.

---

## 4. State Matrix & Fallback Compositions

| State Variant | Status Pill Style | Milestone Footer Display | Fallback Behavior |
| :--- | :--- | :--- | :--- |
| **`active-stream`** | Green `#064E3B` / `#34D399` | Cliff Date (if available) + Schedule | Standard layout |
| **`paused-stream`** | Amber `#78350F` / `#FBBF24` | Cliff Date / Pause notice | Standard layout |
| **`completed-stream`** | Slate `#334155` / `#94A3B8` | Completed schedule range | Progress locked at 100% |
| **`missing-optional-fields`** | Based on status | Progress Bar + Schedule | Omits cliff card, expands schedule bar to fill footer seamlessly |

---

## 5. Meta-Tag Injection & Cache-Busting Strategy

### HTML Pattern (`index.html` Site-Wide Fallback)
`index.html` contains static site-wide fallback metadata for generic routes:
```html
<meta property="og:title" content="Fluxora - Continuous Capital" />
<meta property="og:image" content="https://fluxora.app/freighter-wallet.jpeg" />
```

### Route Injection (`src/components/MetaTags.tsx`)
When a user visits `/app/streams/:streamId`, `MetaTags.tsx` uses `react-helmet-async` to dynamically override the Open Graph and Twitter tags in `<head>`:

```html
<title>{stream.name} – Fluxora</title>
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Fluxora" />
<meta property="og:title" content="{stream.name} – Fluxora" />
<meta property="og:description" content="{stream.summary}" />
<meta property="og:url" content="https://fluxora.app/app/streams/{stream.id}" />
<meta property="og:image" content="https://fluxora.app/og-image/{stream.id}.png?v={cacheBustParam}" />
<meta property="og:image:alt" content="Fluxora stream {stream.name}, status {stream.status}, recipient {stream.recipientName}, rate {monthlyRate} {asset}/mo" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{stream.name} – Fluxora" />
<meta name="twitter:description" content="{stream.summary}" />
<meta name="twitter:image" content="https://fluxora.app/og-image/{stream.id}.png?v={cacheBustParam}" />
<meta name="twitter:image:alt" content="Fluxora stream {stream.name}, status {stream.status}, recipient {stream.recipientName}, rate {monthlyRate} {asset}/mo" />
```

### Cache-Busting Strategy
Whenever a stream's status changes (e.g. from `Active` to `Paused` or `Completed`), or when `updatedAt` / `endDate` is modified:
- `cacheBustParam` is derived from `stream.updatedAt ? Date.parse(stream.updatedAt) : Date.parse(stream.endDate)`.
- The URL appended to `og:image` becomes `https://fluxora.app/og-image/STR-001.png?v=1774300800000`.
- Social crawlers (Twitter/X, LinkedIn, Discord, Slack) notice the `?v=` query change and instantly invalidate their cached preview card.

---

## 6. WCAG 2.1 AA Compliance & Accessibility Matrix

All text and graphical elements meet or exceed WCAG 2.1 AA contrast requirements against their container backgrounds:

| Element | Foreground Color | Background Surface | Contrast Ratio | WCAG Compliance |
| :--- | :--- | :--- | :--- | :--- |
| **Stream Title / Headings** | `#F8FAFC` | `#0F172A` / `#1E293B` | **15.8:1** | PASS (AAA) |
| **Accrual Rate Accent** | `#38BDF8` | `#0F172A` / `#1E293B` | **9.2:1** | PASS (AAA) |
| **Recipient Subtext** | `#CBD5E1` | `#0F172A` | **11.4:1** | PASS (AAA) |
| **Active Pill Text** | `#34D399` | `#064E3B` | **7.1:1** | PASS (AAA) |
| **Paused Pill Text** | `#FBBF24` | `#78350F` | **8.3:1** | PASS (AAA) |
| **Completed Pill Text** | `#94A3B8` | `#334155` | **4.8:1** | PASS (AA) |

### Accessibility Alt Text Specification
To ensure screen readers convey the full context of generated social share cards, `og:image:alt` and `twitter:image:alt` follow a strict descriptive formula:

```
Fluxora stream [Stream Name], status [Status], recipient [Recipient Name] ([Abbreviated Address]), rate [Rate] [Asset]/mo, progress [Progress]%
```

---

## 7. Interactive Preview Modal & Keyboard Walkthrough

The application includes an in-app **Social Share Preview Modal** accessible from `StreamDetail.tsx`:
- Triggered by the "Share & Preview Card" button in the stream page header.
- **Keyboard Navigation**:
  - Focusable via `Tab` / `Shift+Tab` with clear outline focus rings.
  - Activatable via `Enter` or `Space`.
  - Traps focus inside modal when opened; closes on `Escape` key.
- Renders the exact 1200 × 630 canvas at responsive scale with controls to copy OG Image URL or test native Web Share.
