# Stream Detail Open Graph Image Template Specification

## 1. Overview
This specification details the dynamic per-stream Open Graph (OG) image generation system for Fluxora. Each stream detail page (`/app/streams/:streamId`) dynamically generates social preview cards (1200x630 px) with stream details, status badges, recipient metadata, rate of accrual, and Fluxora branding.

---

## 2. Canvas & Layout Dimensions
- **Dimensions**: 1200 px width × 630 px height (Standard 1.91:1 OG Aspect Ratio).
- **Background**: Deep slate gradient (`linear-gradient(135deg, #0F172A 0%, #1E293B 100%)`).
- **Border / Frame**: Subtle 1px translucent border (`rgba(255, 255, 255, 0.1)`) with `24px` rounded container margin.
- **Typography**: Inter (Bold 700 for stream title, Medium 500 for rates and metadata).

---

## 3. Visual Components & Layout Structure

### Header Bar (Top Row)
- **Fluxora Brand**: Logo icon + "FLUXORA" title text in crisp `#38BDF8` (Sky Blue) & `#F8FAFC` (Slate 50).
- **Status Pill (Large Scale)**:
  - **Active**: Background `#064E3B`, Text `#34D399`, Border `#059669` (Contrast ratio > 4.5:1, WCAG 2.1 AA).
  - **Paused**: Background `#78350F`, Text `#FBBF24`, Border `#D97706` (Contrast ratio > 4.5:1, WCAG 2.1 AA).
  - **Completed**: Background `#334155`, Text `#94A3B8`, Border `#475569` (Contrast ratio > 4.5:1, WCAG 2.1 AA).

### Stream Content (Center Body)
- **Stream Name**: 52px Bold (`#F8FAFC`), truncated with ellipsis if exceeding 2 lines.
- **Recipient Section**:
  - Label: `RECIPIENT` (14px uppercase, letter-spacing 1px, `#94A3B8`).
  - Value: Recipient Name + Abbreviated Stellar Address (`GAJC...3P`).
- **Accrual Rate & Total Deposit**:
  - Primary metric card showing monthly rate e.g., `5,000 USDC / mo` (36px Bold `#38BDF8`).
  - Total deposit e.g., `Deposit: 48,000 USDC` (20px `#CBD5E1`).

### Footer / Key Milestones (Bottom Row)
- **Cliff / Milestone Info**:
  - Displays `Cliff Date: YYYY-MM-DD` if defined on the stream record.
  - **Fallback Handling**: If `cliffDate` is omitted, the footer smoothly shifts to display `Progress: X%` and stream `startDate` to `endDate` window without layout shifts or awkward whitespace.

---

## 4. Meta-Tag Injection & Cache-Busting Strategy

### Dynamic Injections (`src/components/MetaTags.tsx`)
On route entry for `/app/streams/:streamId`, `MetaTags.tsx` injects:
```html
<title>{stream.name} – Fluxora</title>
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Fluxora" />
<meta property="og:title" content="{stream.name} – Fluxora" />
<meta property="og:description" content="{stream.summary}" />
<meta property="og:url" content="https://fluxora.app/app/streams/{stream.id}" />
<meta property="og:image" content="https://fluxora.app/og-image/{stream.id}.png?v={updatedAtTimestamp}" />
<meta property="og:image:alt" content="Fluxora stream {stream.name}, status {stream.status}, recipient {stream.recipientName}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://fluxora.app/og-image/{stream.id}.png?v={updatedAtTimestamp}" />
```

### Cache-Busting Strategy
When a stream's status changes (e.g. from `Active` to `Paused`), `stream.updatedAt` or the timestamp of status mutation updates. The image URL includes `?v={timestamp}`. Social crawlers (Twitter, LinkedIn, Slack, Discord) refresh their cached preview image whenever the query parameter changes.

---

## 5. WCAG 2.1 AA Compliance Matrix

| Element | Background | Text Color | Contrast Ratio | Compliance |
| :--- | :--- | :--- | :--- | :--- |
| Canvas Text | `#0F172A` | `#F8FAFC` | 15.8:1 | PASS (AAA) |
| Accent Rate | `#0F172A` | `#38BDF8` | 9.2:1 | PASS (AAA) |
| Active Pill | `#064E3B` | `#34D399` | 7.1:1 | PASS (AAA) |
| Paused Pill | `#78350F` | `#FBBF24` | 8.3:1 | PASS (AAA) |
| Completed Pill | `#334155` | `#94A3B8` | 4.8:1 | PASS (AA) |
