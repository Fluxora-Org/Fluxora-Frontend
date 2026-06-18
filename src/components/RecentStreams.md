# RecentStreams Component

A reusable table component for displaying recent payment streams with status indicators.

## Features

- Section header with "View all" link
- Bordered card container with rounded corners
- Five-column table: STREAM, RECIPIENT, RATE, STATUS, ACTION
- Alternating row backgrounds for readability
- Status pills with icons (Active, Paused, Completed)
- Responsive horizontal scroll on small screens
- Accessible with proper ARIA labels and semantic HTML

## Usage

```tsx
import RecentStreams, { Stream } from './components/RecentStreams';

const streams: Stream[] = [
  {
    id: 'STR-001',
    name: 'Dev Grant - Alice',
    recipient: 'GABC...xyz1',
    rate: '5,000 USDC/mo',
    status: 'Active',
  },
  // ... more streams
];

<RecentStreams 
  streams={streams} 
  viewAllUrl="/streams" // optional, defaults to '/streams'
/>
```

## Props

- `streams`: Array of Stream objects
- `viewAllUrl`: Optional URL for "View all" link (default: '/streams')

## Stream Interface

```typescript
interface Stream {
  id: string;           // e.g., "STR-001"
  name: string;         // e.g., "Dev Grant - Alice"
  recipient: string;    // e.g., "GABC...xyz1"
  rate: string;         // e.g., "5,000 USDC/mo"
  status: 'Active' | 'Paused' | 'Completed';
  detailUrl?: string;   // optional custom detail URL
}
```

## Status Colors

- Active: Green (#00875a on #d1f4e8)
- Paused: Yellow (#cc8800 on #fff4cc)
- Completed: Blue (#0065cc on #d4e7ff)

## Pagination

`RecentStreams` intentionally renders a **fixed, small slice** of streams (the
most recent few) and exposes a "View all" link rather than embedding page
controls.  Full pagination — with per-page selection, page-number buttons, and
an accessible "Showing X – Y of N" summary — lives in `src/pages/Streams.tsx`
and is powered by two collaborating pieces:

| Piece | Responsibility |
|---|---|
| `paginate<T>()` in `Streams.tsx` | Slices the filtered array, clamps `currentPage` to a valid range, and coerces both `page` and `limit` to safe integers. |
| `<Pagination>` in `Pagination.tsx` | Purely presentational: renders the summary text and page-navigation buttons; never touches the data array. |

**Reset rule:** `currentPage` resets to 1 whenever `searchQuery`,
`statusFilter`, or `sortBy` changes, so users never land on an out-of-range
empty page after filtering.
