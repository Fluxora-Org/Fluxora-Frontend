# Time Presentation: Cliffs, End Dates, and Ledger-Relative Clarity

**Issue**: #174  
**Domain**: Fluxora-Frontend (Treasury Streaming Product)  
**Status**: Design Specification  
**Created**: April 29, 2026

---

## 1. Executive Summary

This design specification addresses the presentation of time-related information in Fluxora-Frontend, specifically:
- **Cliff dates**: When funds become available to recipients
- **End dates**: When streams conclude
- **Ledger-relative clarity**: Clear communication of time zones and temporal context

The goal is to ensure treasury managers, recipients, and auditors can easily understand temporal boundaries without ambiguity.

---

## 2. Current State Analysis

### 2.1 Existing Implementation

| Component | Current Behavior |
|-----------|------------------|
| `formatDate()` | Uses `Intl.DateTimeFormat` with "short" format (e.g., "Jan 15, 2026") |
| Cliff date display | Shown in expanded view only |
| End date display | Shown in card header and detail view |
| Time zone info | Not displayed |
| Relative time | Not displayed |

### 2.2 Identified Issues

1. **No time zone context**: Users cannot tell if dates are in local time, UTC, or Stellar ledger time
2. **Missing relative time**: No "in X days" or "X days ago" context
3. **Inconsistent hierarchy**: Cliff and end dates have similar visual weight
4. **No cliff status**: Users cannot quickly see if cliff has passed or is upcoming
5. **Loading states**: Time values show empty skeletons inconsistently

---

## 3. Design Specifications

### 3.1 Time Display Formats

| Context | Format | Example |
|---------|--------|---------|
| Card header (end date) | Relative + Absolute | "Ends in 45 days (Oct 15, 2026)" |
| Expanded view (cliff) | Status badge + Date | "⏱ Cliff passed (Jan 31, 2026)" |
| Expanded view (end) | Relative + Absolute | "Ends Oct 15, 2026 (in 168 days)" |
| Detail page | Full date + Time zone | "October 15, 2026 at 11:59 PM UTC" |
| Timeline events | Relative only | "3 days ago", "Next week" |

### 3.2 Time Zone Display

All time displays MUST include a time zone indicator:

```
Format: "{date} {time} {timezone}"
Examples:
- "Oct 15, 2026 11:59 PM UTC" (ledger time)
- "Jan 15, 2026" (date only, local implied)
- "In 45 days" (relative, no timezone needed)
```

**Ledger Time Note**: Stellar ledger time is UTC. Display "UTC" to indicate this is the canonical time.

### 3.3 Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  STREAM NAME                              [Status] [Health] │
│  ─────────────────────────────────────────────────────────  │
│  Recipient: Alice M. • Treasury: Protocol Growth           │
│                                                             │
│  Streaming: $5,000/mo                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⏱ Cliff: Jan 31, 2026 (passed)     End: Oct 15     │   │
│  │ ████████████░░░░░░░░░░░░░░░░░░░░░░ 40% complete    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Hierarchy Rules**:
1. End date is more prominent than cliff date
2. Passed cliffs show "passed" badge in muted style
3. Upcoming cliffs show "in X days" in accent color
4. Time zone indicator is subtle (secondary text color)

### 3.4 Component States

| State | Cliff Display | End Date Display |
|-------|---------------|------------------|
| Default | Date + relative | Date + relative + progress |
| Cliff upcoming (< 7 days) | Warning color + "soon" | — |
| Cliff passed | Muted + "passed" badge | — |
| End upcoming (< 14 days) | — | Accent color + "ending soon" |
| Stream completed | — | "Completed" badge |
| Loading | Skeleton placeholder | Skeleton placeholder |
| Empty | "No cliff set" | "No end date" |

### 3.5 Accessibility Requirements

| Requirement | Implementation |
|-------------|-----------------|
| Screen reader | `aria-label="Cliff date: January 31, 2026 (passed), End date: October 15, 2026"` |
| Focus order | Date elements follow logical reading order |
| Color independence | Status conveyed by text, not just color |
| Keyboard navigation | All date actions keyboard-accessible |
| Contrast | Minimum 4.5:1 for date text |

---

## 4. Implementation Specifications

### 4.1 New Utility Functions

```typescript
// src/lib/timePresentation.ts

/**
 * Format date with optional time zone
 */
function formatDateWithTimezone(date: string | undefined, showTimezone?: boolean): string

/**
 * Get relative time string (e.g., "in 45 days", "3 days ago")
 */
function getRelativeTime(date: string | undefined): string

/**
 * Get cliff status (upcoming, passed, or none)
 */
function getCliffStatus(cliffDate: string | undefined): CliffStatus

/**
 * Combined time display for cards
 */
function formatStreamTimeRange(startDate: string, cliffDate?: string, endDate?: string): TimeDisplay
```

### 4.2 CSS Tokens

```css
/* Time display tokens */
--time-cliff-upcoming: var(--color-warning);
--time-cliff-passed: var(--color-text-muted);
--time-end-upcoming: var(--color-accent-primary);
--time-end-completed: var(--color-success);
--time-timezone: var(--color-text-tertiary);
```

### 4.3 Responsive Behavior

| Breakpoint | Time Display Behavior |
|------------|----------------------|
| Mobile (< 640px) | Stack: date on separate line, hide timezone |
| Tablet (640-1024px) | Inline with abbreviated relative |
| Desktop (> 1024px) | Full format with timezone |

---

## 5. File Changes

### 5.1 New Files

- `src/lib/timePresentation.ts` - Time formatting utilities

### 5.2 Modified Files

- `src/pages/Streams.tsx` - Update time display in cards and detail view
- `src/pages/Streams.css` - Add time hierarchy styles
- `src/data/streamRecords.ts` - Add `cliffStatus` field to records

---

## 6. Acceptance Criteria

- [ ] All stream cards show cliff date with status (passed/upcoming/none)
- [ ] All stream cards show end date with relative time
- [ ] Time zone (UTC) displayed on detail pages
- [ ] Loading states show consistent skeletons
- [ ] Screen readers announce cliff and end dates with status
- [ ] Mobile responsive: time info readable on small screens
- [ ] Color independence: passed cliffs identifiable without color

---

## 7. Open Questions

1. **Ledger time vs local time**: Should we show both? (Current: UTC only)
2. **Historical streams**: How to display end dates for completed streams?
3. **Time zone preference**: Allow users to set their local timezone?

---

## 8. Deferred Items

| Item | Rationale | Owner |
|------|-----------|-------|
| User timezone preference | Requires backend storage | Future sprint |
| Time zone selector UI | Low priority, most users accept UTC | Future sprint |