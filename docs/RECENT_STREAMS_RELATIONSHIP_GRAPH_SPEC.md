# Force-Directed Relationship Graph Design Specification

## Overview
This specification details the alternate force-directed graph view for the `RecentStreams` panel on the Treasury Overview page. This graph plots the treasury wallet and each recipient as nodes with edges weighted by stream rate. The goal is to provide a visual tool for spotting recipient clusters and concentration risk at a glance.

## 1. States & Layout
- **Table View (Default)**: The standard `<StreamsTable />` view is shown.
- **Graph View**: Toggleable via a segmented control in the panel header. 
  - **Settling (Animated)**: Initial state when the graph loads. Nodes apply physics rules and animate into position.
  - **Settled (Static/Reduced Motion)**: Physics simulations are complete. If `prefers-reduced-motion` is active, the graph skips the settling animation and jumps straight to this state using a static layout (e.g., a simple circular or tree layout).
  - **Node-Selected**: Hovering or focusing a node highlights the connected edges and dimming non-connected nodes and edges.
  - **Empty**: Fallback to the standard empty state.

## 2. Design Specs & Styling
### Nodes
- **Central Node (Treasury)**: Represents the source.
- **Recipient Nodes**: Represent the receivers.
- **Sizing**: Node radius is proportional to the cumulative streamed amount.
  - Minimum size: `16px`
  - Maximum size: `64px`
- **Color**: 
  - Node fill must meet a **3:1 non-text contrast ratio** against the panel background in both light and dark themes. 
  - Recommended Fill (Light Theme): `#0d9488` (Teal 600)
  - Recommended Fill (Dark Theme): `#2dd4bf` (Teal 400)

### Edges
- **Thickness**: Edge stroke width is proportional to the stream rate.
  - Minimum thickness: `1px`
  - Maximum thickness: `8px`
- **Color**:
  - Edge stroke must meet **3:1 non-text contrast ratio**.
  - Recommended Stroke: `#9ca3af` (Gray 400) for unselected, `#0d9488` for selected/highlighted edges.

### Controls
- **Toggle**: Segmented control or icon buttons (Table vs. Graph) in the header next to "View all →".
- **Pan/Zoom Controls**: Small floating toolbar on the bottom right of the graph container containing `+` (Zoom In), `-` (Zoom Out).
- **Reset View**: A button in the pan/zoom toolbar to reset scale to `1` and center the graph.

## 3. Accessibility & Keyboard Interaction
- **Screen Readers**: 
  - The graph container (`<svg>` or `<canvas>`) must be marked with `aria-hidden="true"`.
  - A visually hidden text alternative or the data-table itself is always available. The table view is fully accessible.
- **Keyboard Navigation**:
  - The view toggle and pan/zoom/reset controls must be fully keyboard-operable.
  - The graph itself **does not trap focus**. Users can tab past it to the controls.
- **Reduced Motion**: Respect `@media (prefers-reduced-motion: reduce)` by bypassing the physics simulation and immediately rendering the settled, static layout.

## 4. Responsive Behavior
- **Mobile (< `md` breakpoint)**: The graph view is hidden. The table view is forced and the toggle is not rendered.
- **Desktop (>= `md` breakpoint)**: The toggle is visible. Table view is the default.

## 5. Engineering Hand-off Checklist
- [ ] Contrast ratios verified in Light and Dark themes.
- [ ] Keyboard focus order tested (Toggle -> View all -> Zoom controls -> Reset view).
- [ ] `prefers-reduced-motion` skips physics simulation.
- [ ] `aria-hidden="true"` applied to visual graph elements.
- [ ] Responsive behavior verified below `--breakpoint-md`.
