# Embeddable Stream Widget Specification

## Overview

The Fluxora Embeddable Stream Widget provides a responsive, themeable component that displays real-time stream status information. Designed for embedding in third-party websites via iframe, it offers three layout presets with full accessibility compliance.

## Architecture

### Component Structure
```
src/pages/EmbedStreamWidget.tsx          # Main embed route component
src/lib/embedThemeParser.ts              # Secure theme parameter parsing
src/components/embed/                    # Widget layout components
  ├── EmbedWidgetLayouts.tsx            # Layout implementations
  └── EmbedWidgetLayouts.css            # Responsive styling
src/hooks/useEmbedAccessibility.ts      # Accessibility utilities
```

### Data Flow
1. URL parameters parsed (`streamId`, `theme`, `accent-color`, `preset`)
2. Theme validation and application
3. Stream data fetched via `streamsService`
4. Layout rendered based on preset
5. Accessibility features initialized

## Widget Presets

### 1. Card Layout (`preset=card`)
- **Dimensions**: 300px-420px width
- **Components**:
  - Stream title and status badge
  - StreamTimeline visualization
  - Payment rate, streamed/remaining amounts
  - Progress bar with percentage
  - "Powered by Fluxora" footer
- **Use Case**: Narrow sidebars, dashboard widgets

### 2. Banner Layout (`preset=banner`)
- **Dimensions**: 600px+ width (horizontal layout)
- **Components**:
  - Title and status (compact)
  - Compact StreamTimeline
  - Payment rate and progress bar inline
- **Use Case**: Wide content areas, header banners

### 3. Compact Layout (`preset=compact`)
- **Dimensions**: 200-300px width
- **Components**:
  - Status badge and progress percentage
  - Minimal progress bar
  - Small attribution
- **Use Case**: Small spaces, status indicators

## Widget States

### Loading State
- Skeleton placeholders matching widget preset
- `aria-busy="true"` and `role="status"`
- No layout shifts during loading

### Live State (Active Stream)
- Animated progress updates (respects reduced motion)
- Active status badge styling
- Timeline visualization with current position

### Paused State
- Paused status badge
- Static timeline visualization
- Visual distinction from active state

### Completed State
- 100% progress visualization
- Completed status badge
- Final amounts displayed

### Error States
- **Invalid Stream ID**: Accessible error message with "Powered by Fluxora" attribution
- **Network Error**: Retry-capable error state
- **Invalid Theme**: Graceful fallback to default theme

## Theme Query Parameters

### Supported Parameters
- `?theme=light|dark` - Apply light or dark theme
- `?accent-color=%2300AEEF` - Custom accent color (hex format)
- `?preset=card|banner|compact` - Widget layout preset

### Security Validation
The theme parser rejects:
- `rgb()`, `hsl()`, other color formats
- `javascript:` or `data:` URLs
- Strings containing parentheses or semicolons
- Malformed hex colors

Invalid parameters gracefully fall back to defaults without breaking the widget.

### Example URLs
```
/embed/streams/STR-001?theme=dark&preset=card
/embed/streams/STR-001?theme=light&accent-color=%2300AEEF&preset=banner
/embed/streams/STR-001?preset=compact
```

## Accessibility

### WCAG 2.1 AA Compliance
- **Perceivable**: Proper contrast ratios (4.5:1 minimum), text alternatives
- **Operable**: Keyboard navigation, no keyboard traps, sufficient time
- **Understandable**: Predictable operation, input assistance
- **Robust**: Compatible with assistive technologies

### Specific Features
- `role="article"` with `aria-label` on widget container
- Status badges use `role="status"` with descriptive `aria-label`
- Progress bars use `role="progressbar"` with `aria-valuemin/max/now`
- Screen reader announcements for state changes
- Focus management for keyboard users
- Skip link for embedded context

### Contrast Verification
All presets meet WCAG AA contrast requirements:
- Light theme: Tested against `#ffffff` background
- Dark theme: Tested against `#1a1f36` background
- Custom accents: Validated for minimum 4.5:1 contrast

## Responsive Design

### Breakpoints
- **Mobile (<640px)**: Banner layout stacks vertically, card layout adjusts metrics grid
- **Tablet (640px-1024px)**: All layouts maintain design integrity
- **Desktop (1024px+)**: Optimized spacing and typography

### Container Queries
Widgets respond to container width, not just viewport:
- Card: 300px-420px optimal, scales down to 200px
- Banner: 500px-800px optimal, stacks below 640px
- Compact: 200px-300px fixed width design

### No Overflow Guarantee
- No horizontal scrolling within widget bounds
- Text truncation with tooltips where necessary
- Flexible containers that respect parent dimensions

## Content Security Policy (CSP)

### Current Configuration
The project prevents embedding using `frame-ancestors 'none'` in global CSP headers.

### Route-Scoped Approach
For production deployment, implement route-scoped CSP headers:

```nginx
# Example Nginx configuration
location /embed/streams/ {
    # Allow embedding from trusted origins
    add_header Content-Security-Policy "frame-ancestors https://trusted-site.com https://another-trusted-site.com";
    
    # Keep other security headers
    add_header X-Frame-Options "ALLOW-FROM https://trusted-site.com";
}

location / {
    # Default deny embedding
    add_header Content-Security-Policy "frame-ancestors 'none'";
    add_header X-Frame-Options "DENY";
}
```

### Security Recommendations
1. **Allow-List Only**: Never use `frame-ancestors *` 
2. **HTTPS Required**: Only allow HTTPS origins
3. **Specific Paths**: Apply embedding permissions only to `/embed/` routes
4. **Audit Logging**: Monitor embed usage and sources

## Mock Data Architecture

### Data Layer Abstraction
```typescript
// Current implementation uses streamsService
getStreamById(streamId: string): Promise<StreamRecord>

// Future integration requires only:
// 1. Update streamsService to call real API
// 2. Ensure StreamRecord interface compatibility
```

### Integration Points
1. **Backend API**: Replace `getStreamById` with real API call
2. **Smart Contracts**: Add contract interaction layer
3. **Database**: Stream records from persistent storage
4. **Authentication**: Optional token-based stream access

### Type Safety
The `StreamRecord` interface ensures data consistency:
- All monetary values as `number`
- Date strings in ISO-8601 format
- Status as typed union `"Active" | "Paused" | "Completed"`

## Testing Strategy

### Unit Tests
- Theme parser validation
- Widget layout rendering
- Accessibility attribute application
- Error state handling

### Integration Tests
- Route parameter parsing
- Theme application to DOM
- Data fetching and error handling
- Responsive behavior

### E2E Tests
- Embed iframe loading
- Theme parameter application
- Keyboard navigation
- Screen reader compatibility

### Test Coverage Goals
- 95%+ unit test coverage
- All widget states tested
- All theme combinations validated
- Accessibility compliance verified

## Engineering Handoff Notes

### Development Workflow
1. **Local Testing**: Use `?streamId=STR-001&theme=dark&preset=card`
2. **Theme Testing**: Verify custom accent colors and contrast
3. **Responsive Testing**: Test all presets at multiple widths
4. **Accessibility**: Screen reader and keyboard navigation testing

### Deployment Checklist
- [ ] CSP headers configured for embed routes
- [ ] SSL certificates valid (HTTPS required)
- [ ] CORS headers if needed for API calls
- [ ] Embed usage monitoring enabled
- [ ] Error tracking for embed failures

### Performance Considerations
- **Bundle Size**: Widget components lazy-loaded
- **Caching**: Stream data with appropriate cache headers
- **CDN**: Static assets delivered via CDN
- **LCP**: Critical CSS inlined for embed route

### Security Considerations
- **Input Validation**: All URL parameters strictly validated
- **XSS Prevention**: No arbitrary CSS/HTML injection
- **Clickjacking**: CSP headers prevent unauthorized embedding
- **Data Exposure**: Only public stream data exposed

## Future Enhancements

### Phase 2 Features
1. **Stream Filtering**: Multiple streams in single widget
2. **Custom Styling**: Additional CSS variable overrides
3. **Event Callbacks**: JavaScript API for embed interactions
4. **Analytics**: Embed usage tracking
5. **Webhook Support**: Real-time updates via SSE/WebSocket

### Phase 3 Features
1. **Interactive Controls**: Pause/resume from widget
2. **Authentication**: Token-based private stream access
3. **Multi-Language**: Internationalization support
4. **Advanced Theming**: Complete design token overrides

## Support & Maintenance

### Browser Support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- IE11 not supported (requires polyfills)

### Monitoring
- Console error logging for embed failures
- Usage analytics via embed source headers
- Performance metrics for widget load times

### Breaking Changes
1. **Versioning**: Semantic versioning for embed API
2. **Deprecation**: 6-month notice for breaking changes
3. **Migration**: Documentation for API version upgrades
4. **Fallbacks**: Graceful degradation for older versions