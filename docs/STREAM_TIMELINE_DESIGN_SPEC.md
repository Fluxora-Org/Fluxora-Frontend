# Stream Timeline Visualization - Design Specification

## Overview

The Stream Timeline is a horizontal bar visualization that communicates the temporal structure of a stream at a glance. It displays the cliff period, active accrual phase, remaining period, and key dates in a single visual track.

**Core Value Proposition**: Fluxora's real-time treasury streaming is made tangible through visual timeline representation, helping users understand stream lifecycle instantly.

---

## Visual Design

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Stream Timeline Container                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Timeline Bar (Segments)                                 │ │
│  │ ┌──────────┬──────────────────────┬────────────────┐   │ │
│  │ │ Cliff ⟨⟩ │ Accrual (Progress) ⟶│ Remaining      │   │ │
│  │ │ Hatched   │ Gradient Fill       │ Empty/Light    │   │ │
│  │ └──────────┴──────────────────────┴────────────────┘   │ │
│  │                                ↑ Current marker        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Date Labels                                             │ │
│  │ Start    Cliff End                    End               │ │
│  │ Jan 1    Jan 15                       Dec 31            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Legend                                                  │ │
│  │ ⊞ Cliff period (locked)                                │ │
│  │ ⊞ Accrual phase (unlocking)                            │ │
│  │ ⊞ Remaining (locked)                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Segments

| Segment | Visual | Meaning | Status |
|---------|--------|---------|--------|
| **Cliff** | Hatched pattern (45° lines) | Period before any accrual; funds are locked | Changes color based on status |
| **Accrual** | Gradient fill (cyan → blue) | Active unlocking phase; progress indicator | Animated shimmer when active |
| **Remaining** | Light/empty background | Post-current funds still locked until end date | Static appearance |

### Current Date Marker

- **Visual**: Thin vertical line (2px, dark color)
- **Animation**: Subtle pulse (opacity 1→0.6) every 2 seconds
- **Placement**: Positioned at accrual end point or current date, whichever is sooner
- **Accessibility**: ARIA label announces position

---

## Design Tokens Integration

### Colors

```css
/* From design-tokens.css */

/* Cliff Segment (Hatched) */
--cliff-color: var(--color-warning, #f59e0b);
--cliff-opacity: 0.85;

/* Accrual Segment (Progress) */
--accrual-start: #2dd4bf;
--accrual-end: #0ea5e9;
--accrual-opacity: 0.95;
--accrual-shimmer-active: 1;

/* Remaining Segment */
--remaining-bg: var(--color-surface-raised, #e8ecf1);
--remaining-opacity: 0.6;

/* Current Marker */
--marker-color: var(--color-text-primary, #1a1f36);
--marker-pulse: 2s ease-in-out infinite;

/* Status Colors */
--status-active: inherit;
--status-completed: var(--color-success, #10b981);
--status-paused: grayscale(50%) opacity 0.5;
--status-upcoming: var(--color-info, #00b8d4);
```

### Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Date labels | 0.75rem (10px) | 600 | `--color-text-primary` |
| Section labels | 0.7rem (9px) | 400 | `--color-text-tertiary` |
| Segment %/text | 0.7rem (9px) | 600 | white (cliff/accrual), primary (remaining) |
| Legend text | 0.85rem (13px) | 400 | `--color-text-secondary` |

### Spacing

| Element | Value |
|---------|-------|
| Container padding | 1rem |
| Bar top margin | 1rem |
| Labels margin | 0.5rem |
| Legend gap | 1rem |
| Legend top border | 1rem |

### Layout Dimensions

| Breakpoint | Bar Height | Responsive |
|-----------|-----------|-----------|
| Mobile ≤375px | 36px | Single column, date labels wrapping |
| Mobile ≤320px | 32px | Minimal labels |
| Tablet ≥768px | 56px | Full layout |
| Desktop ≥1024px | 64px | Maximum clarity |

---

## States and Behaviors

### Stream Status States

| State | Cliff | Accrual | Remaining | Marker | Notes |
|-------|-------|---------|-----------|--------|-------|
| **active** | Normal opacity (0.85), orange hatch | Gradient + shimmer animation | Light background | Pulsing animation | Most common state |
| **completed** | Green hatch (0.7 opacity) | Gradient + static (no animation) | Minimal visibility (0.4 opacity) | Removed/hidden | Show completion visually |
| **paused** | Desaturated (0.6 opacity) | Desaturated + grayscale filter | Reduced (0.5) | Hidden | Indicates frozen state |
| **upcoming** | Light blue | Not visible (current < start) | Full bar | Not visible | Stream hasn't started |

### Interactive States

| Event | Behavior |
|-------|----------|
| **Hover** | Segment opacity increases slightly (if cliff/accrual visible) |
| **Focus** | Container receives 2px outline in focus color; outline-offset: 2px |
| **Active/Press** | No state change (read-only visualization) |
| **Loading** | Shows spinner + "Loading timeline..." message |
| **Error** | Shows error message, timeline bar hidden |

### Edge Cases

| Case | Handling |
|------|----------|
| **No cliff date** | Cliff segment omitted; accrual starts from stream start |
| **Long date strings** | Truncate with ellipsis (…) on ≤320px screens; use "MM/DD" format |
| **Overlapping dates** | All dates required; validation in component constructor |
| **Current > End date** | Show 100% accrual; marker hidden; remaining segment removed |
| **Zero accrual** | Accrual segment width = 0; cliff displayed in full |

---

## Accessibility

### WCAG 2.1 AA Compliance

#### Color Contrast ✓

| Element | Foreground | Background | Ratio | Standard |
|---------|-----------|-----------|-------|----------|
| Date labels | `#1a1f36` (text-vivid) | `#fafbfc` (surface-neutral) | 16:1 | AAA |
| Legend text | `#4a5565` (text-secondary) | `#fafbfc` | 7.5:1 | AAA |
| Cliff segment | `#f59e0b` (warning) | `#fafbfc` | 4.8:1 | AA ✓ |
| Accrual segment | `#0ea5e9` (primary) | `#ffffff` (inside bar) | 5.2:1 | AA ✓ |
| Current marker | `#1a1f36` (text-vivid) | Any segment | Meets AA | AA ✓ |

#### Screen Reader Support

```html
<!-- Container: region landmark -->
<div role="region" aria-label="Stream timeline visualization">
  <!-- Accessible text summary (sr-only) -->
  <div role="doc-subtitle">
    <h3 class="sr-only">Timeline Summary</h3>
    <ul class="sr-only">
      <li>Start date: Jan 1, 2024</li>
      <li>Cliff end date: Jan 15, 2024</li>
      <li>Current date: Mar 15, 2024</li>
      <li>End date: Dec 31, 2024</li>
      <li>Stream status: active</li>
      <li>Progress: 23% complete</li>
    </ul>
  </div>

  <!-- Visual timeline bar: progressbar role -->
  <div role="progressbar" 
       aria-valuenow="23" 
       aria-valuemin="0" 
       aria-valuemax="100"
       aria-label="Stream accrual progress">
    <!-- Segments with aria-labels -->
    <div class="segment--cliff" 
         role="img"
         aria-label="Cliff period: Jan 1, 2024 to Jan 15, 2024" />
    <div class="segment--accrual" 
         role="img"
         aria-label="Accrual period: Jan 15, 2024 to Mar 15, 2024" />
    <div class="segment--remaining" 
         role="img"
         aria-label="Remaining period: Mar 15, 2024 to Dec 31, 2024" />
    
    <!-- Current marker -->
    <div class="marker" 
         role="img"
         aria-label="Current date: Mar 15, 2024" />
  </div>
</div>
```

#### Keyboard Navigation

| Key | Action | Support |
|-----|--------|---------|
| Tab | Focus container region | ✓ Built-in |
| Enter/Space | No interaction needed | N/A (read-only) |
| Arrow keys | Navigate nested elements | Not needed |

#### Focus Management

- Container receives focus outline: `2px solid var(--interactive-focus-ring)`
- Outline offset: `2px` for visibility
- All interactive elements within have focus indicators
- Focus order follows visual order (left to right)

#### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  .stream-timeline-bar__segment--accrual.is-active {
    animation: none; /* Remove shimmer */
  }
  .stream-timeline-bar__marker {
    animation: none; /* Remove pulse */
  }
  .stream-timeline__loading-spinner {
    animation: none; /* Stop spinner */
  }
}
```

#### High Contrast Mode Support

- Borders added to segments in high-contrast mode
- Marker width increased to 4px
- Text weight increased to 700
- Opacity reduced to increase viability

#### Testing Checklist

- [ ] Axe DevTools: No automated accessibility violations
- [ ] NVDA screen reader: All text content announced
- [ ] JAWS screen reader: Smooth navigation
- [ ] Keyboard-only: Tab key focuses container, arrows work
- [ ] Color blindness simulator: All colors distinguishable
- [ ] Zoom to 200%: Layout remains responsive, no overflow
- [ ] Dark mode: Text contrast maintained
- [ ] High contrast mode: All elements visible

---

## Responsive Design

### Mobile (≤375px)

```
┌─────────────────────┐
│ Start  Jan 1        │
│ ┌─────────────────┐ │
│ │⟨⟩Cliff│Accrual  │ │
│ │◀ Prog ▶│Remain  │ │
│ └─────────────────┘ │
│ Cliff  Jan 15       │
│ End    Dec 31       │
│ ⊞ Cliff (locked)    │
│ ⊞ Accrual (unlock)  │
│ ⊞ Remaining (lock)  │
└─────────────────────┘
```

**Adjustments**:
- Bar height: 36px
- Font sizes: Reduced 10%
- Date labels: Stacked below bar (not inline)
- Labels: Hidden on ≤320px (show only dates)
- Legend wraps to 2–3 lines

### Tablet (≥768px)

```
┌────────────────────────────────────┐
│ Start      Cliff    Current    End  │
│ Jan 1      Jan 15   Mar 15    Dec31 │
│ ┌──────────────────────────────────┐│
│ │⟨⟩Cliff⬤Accrual (progress)│Rem   ││
│ └──────────────────────────────────┘│
│ ⊞ Cliff (locked)                    │
│ ⊞ Accrual (unlocking)               │
│ ⊞ Remaining (locked)                │
└────────────────────────────────────┘
```

**Adjustments**:
- Bar height: 56px
- Full-width date labels above
- Legend single row

### Desktop (≥1024px)

```
┌──────────────────────────────────────────┐
│ Start          Cliff           Current   End
│ Jan 1          Jan 15          Mar 15    Dec 31
│ ┌──────────────────────────────────────────┐
│ │⟨⟨⟨⟩Cliff⬤⬤Accrual (35%) Progress ▶│Rem (65%)│
│ └──────────────────────────────────────────┘
│ ⊞ Cliff period (locked)
│ ⊞ Accrual phase (unlocking)
│ ⊞ Remaining (locked)
└──────────────────────────────────────────┘
```

**Adjustments**:
- Bar height: 64px
- Percentage labels inside segments
- Legend spans full width

### Testing Breakpoints

- [ ] 320px: iPhone SE, minimal labels
- [ ] 375px: iPhone 12/13, labels visible
- [ ] 480px: Large phones, intermediate layout
- [ ] 768px: iPad, tablet layout
- [ ] 1024px: Desktop, full experience
- [ ] 1920px: Large monitor, scales appropriately

---

## Integration Points

### Props Interface

```typescript
interface StreamTimelineProps {
  startDate: string;           // ISO 8601 format
  cliffDate: string | null;    // ISO 8601 format, optional
  currentDate: string;         // ISO 8601 format (typically today)
  endDate: string;             // ISO 8601 format
  withdrawableAmount: number;  // USD amount
  totalAmount: number;         // USD amount
  status: "active" | "paused" | "completed" | "upcoming";
  isLoading?: boolean;         // Shows spinner overlay
}
```

### Usage Example

```tsx
import StreamTimeline from "../components/StreamTimeline";

function StreamDetail({ stream }) {
  return (
    <StreamTimeline
      startDate={stream.startDate}
      cliffDate={stream.cliffDate}
      currentDate={new Date().toISOString()}
      endDate={stream.endDate}
      withdrawableAmount={stream.withdrawableAmount}
      totalAmount={stream.totalAmount}
      status={stream.status}
      isLoading={false}
    />
  );
}
```

### Placement in Stream Detail Page

1. **Above timeline list** in `src/pages/Streams.tsx` → `StreamDetail` component
2. **Alongside existing time fields** (cliff date, end date)
3. **Below metrics cards** for context
4. **Above "Timeline" panel** for detailed events

---

## Design Specifications Summary

| Aspect | Specification |
|--------|---------------|
| **Type** | Horizontal progress/status visualization |
| **Layout** | 3-segment bar with date labels and legend |
| **Segmentation** | Cliff (hatched) → Accrual (gradient) → Remaining (light) |
| **Colors** | Warning (cliff), Accent (accrual), Surface (remaining) |
| **Animation** | Shimmer (accrual active), Pulse (current marker) |
| **Responsive** | 3 breakpoints (mobile, tablet, desktop) |
| **Accessibility** | WCAG 2.1 AA, screen reader support, keyboard navigation |
| **Dark theme** | Supported via CSS custom properties |
| **Print-ready** | Hides animations, maintains layout |
| **Performance** | 60fps animations, CSS-only (no JavaScript) |

---

## Future Enhancements

1. **Hover tooltips**: Show exact dates on hover
2. **Interactive markers**: Click to see milestone details
3. **Historical view**: Toggle between current and past dates
4. **Comparative view**: Side-by-side multiple streams
5. **Export**: Generate timeline image for reports

---

## Appendix: File Structure

```
src/
├── components/
│   ├── StreamTimeline.tsx          (React component)
│   └── StreamTimeline.module.css   (Styles + responsive)
├── pages/
│   ├── Streams.tsx                 (Integration point)
│   └── Streams.css                 (Existing page styles)
├── design-tokens.css               (Updated with timeline tokens)
└── [integration in stream-detail view]
```

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation & QA
