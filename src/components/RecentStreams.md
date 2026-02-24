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
