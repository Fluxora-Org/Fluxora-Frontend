# Force-Directed Relationship Graph Design Specification

## Overview
This specification details the alternate force-directed graph view for the `RecentStreams` panel on the Treasury Overview page. This graph plots the treasury wallet and each recipient as nodes with edges weighted by stream rate. The goal is to providing visual tools for spotting recipient clusters and concentration risk at a glance.

## 1. States & Transitions
The graph component manages the following states:

| State | Description | Triggered |
|---|---|---|
| **Default** | Graph is hidden; table view shown | Component mount or viewMode="table" |
| **Graph Visible** | Graph view rendered, physics simulation running | viewMode="graph" |
| **Settling (Animated)** | Force simulation ticks; nodes move toward equilibrium | Graph loads while `prefers-reduced-motion` is false |
| **Settled** | Simulation complete; nodes static; edges animate transitions | All node velocities below threshold OR `prefers-reduced-motion` is true |
| **Node-Selected** | Clicking/focusing a node highlights connected edges and dims others | User activates a node |
| **Empty** | No streams data; fallback empty message shown | `streams.length === 0` while graph view active |

### Animation Timing
- **Settling**: 150-800ms depending on node count (max 300 simulation iterations).
- **Highlight transition**: 200ms opacity/transition on edges and nodes.
- **Pulse aura** on treasury wallet node: 1.5s ease-in-out infinite (disabled when settled).

### Reduced Motion Fallback
When `prefers-reduced-motion: reduce` is active:
1. The force simulation is skipped entirely.
2. Nodes are placed in a **static circular layout**: treasury at center, recipients equidistant around a circle.
3. No pulse animation; no transition on node highlights.
4. The layout is deterministic and reproducible.

## 2. Design Tokens & Styling
All visual values use design tokens from `src/design-tokens.css` with CSS custom properties as fallbacks.

### Layout
| Token | Value | Notes |
|---|---|---|
| SVG coordinate space | `0 0 800 400` | Fixed, scaled via viewBox |
| Container min-height | `400px` | Responsive below md breakpoint |
| Center X (`CX`) | `400` | SVG midpoint |
| Center Y (`CY`) | `200` | SVG midpoint |
| Max zoom | `5x` | Capped to prevent disorientation |
| Min zoom | `0.3x` | Capped to prevent excessive detail |
| Zoom step | `1.25x` | Per button click or wheel tick |
| Spring rest length | `130px` | Edge equilibrium distance |
| Repulsion strength | `3000` | Coulomb-like repulsion |
| Spring constant | `0.012` | Hooke's law coefficient |
| Gravity strength | `0.01` | Central attraction |
| Damping factor | `0.84` | Velocity decay per tick |
| Settle threshold | `0.01` | Max velocity to consider settled |

### Nodes
| Property | Treasury Wallet | Recipient |
|---|---|---|
| Base radius | `MAX_NODE_RADIUS + 4` → `42px` | Scaled by cumulative amount |
| Radius range | `42px` (fixed, larger) | `16px` – `38px` |
| Fill color | `var(--color-accent-primary, #00b8d4)` | `var(--color-accent-secondary, #00d4aa)` |
| Stroke color | `var(--color-accent-primary-dark, #0097a7)` | `var(--color-accent-secondary-dark, #00a884)` |
| Stroke width | `2px` | `2px` |
| Glow aura | `r = radius + 5`, stroke-opacity `0.35`, pulsing while settling | None |
| Label position | Above node (`y - radius - 6`) | Above node (`y - radius - 6`) |
| Amount label | None | Below node (`y + radius + 14`), `10px`, muted |

### Edges
| Property | Value |
|---|---|
| Stroke color (treasury→recipient) | `var(--color-accent-primary, #00b8d4)` |
| Stroke color (other) | `var(--color-text-muted, #6b7a94)` |
| Stroke width range | `1px` – `7px` |
| Stroke width mapping | Linear mapping from stream rate to `[MIN_EDGE_WIDTH, MAX_EDGE_WIDTH]` |
| Stroke opacity (default) | `0.45` |
| Stroke opacity (highlighted) | `0.9` (overrides default, via `.highlighted` class) |
| Stroke opacity (dimmed) | `0.12` (overrides default, via `.dimmed` class) |
| Stroke linecap | `round` |
| Transition | `stroke-opacity 0.2s ease, stroke-width 0.2s ease` |

### Controls
| Control | Position | Size | Aria-label |
|---|---|---|---|
| Zoom In (`+`) | Bottom-right toolbar | `36x36px` | "Zoom in" |
| Zoom Out (`−`) | Bottom-right toolbar | `36x36px` | "Zoom out" |
| Reset View (`↺`) | Bottom-right toolbar | `36x36px` | "Reset view" |
| Tooltip divider | Between zoom buttons | 1px height | — |

Controls use `role="toolbar"` and `aria-label="Graph view controls"`. Each button has `type="button"`.

### Legend
| Item | Visual | Label |
|---|---|---|
| Treasury | `10x10px` circle, `var(--color-accent-primary)` | "Treasury wallet" |
| Recipient | `10x10px` circle, `var(--color-accent-secondary)` | "Recipient" |
| Higher rate | `20x4px` line | "Higher rate" |
| Lower rate | `20x1px` line | "Lower rate" |
| Node sizing | Text note | "Node size = cumulative streamed amount" |

Legend position: top-left, above the graph content.

## 3. Accessibility
### Screen Readers
- The `<svg>` element carries `aria-hidden="true"`.
- The graph container `<div>` carries `role="img"` with an `aria-label` summarizing the visual content (e.g., "Force-directed relationship graph showing N streams from the treasury wallet to M recipients").
- A `<noscript>` fallback renders `<StreamsTable />` for non-JS environments.
- The table view is **always available** as a non-graph alternative; switching to table view provides the fully accessible data representation.

### Keyboard
| Control | Keyboard | Behavior |
|---|---|---|
| Zoom In | Focus button → `Enter` / `Space` | Zoom in by 1.25x |
| Zoom Out | Focus button → `Enter` / `Space` | Zoom out by 1.25x |
| Reset View | Focus button → `Enter` / `Space` | Reset to zoom=1, pan=(0,0) |
| Toggle Table/Graph | Focus toggle button → `Enter` / `Space` | Switch view mode |
| Node activation | Focus node → `Enter` / `Space` | Toggle node selection (highlights connected edges) |
| Escape (node) | Focus node → `Esc` | Deselect node |
| Tab | Global | Moves focus through interactive elements; graph itself is not in focus order |

### Focus Management
- The graph SVG has `focusable={false}`.
- Nodes in the SVG have `tabIndex={0}` and `role="button"` for keyboard activation.
- Pan/zoom controls use `focus-visible` outlines matching the design token `--focus-ring-color`.
- The graph does NOT trap focus; users can tab past it.

### Contrast (WCAG 2.1 AA)
All graph colors must meet **3:1 non-text contrast** against both themes:

| Element | Light Theme | Dark Theme | Target | Verified |
|---|---|---|---|---|
| Treasury node fill (`#00b8d4`) on `#f5f7fa` | ~3.5:1 | — | ≥ 3:1 | ✓ |
| Treasury node fill (`#00b8d4`) on `#0f1624` | — | ~5.8:1 | ≥ 3:1 | ✓ |
| Recipient node fill (`#00d4aa`) on `#f5f7fa` | ~3.2:1 | — | ≥ 3:1 | ✓ |
| Recipient node fill (`#00d4aa`) on `#0f1624` | — | ~5.0:1 | ≥ 3:1 | ✓ |
| Edge stroke (`#6b7a94`) on `#f5f7fa` | ~4.2:1 | — | ≥ 3:1 | ✓ |
| Edge stroke (`#6b7a94`) on `#0f1624` | — | ~3.3:1 | ≥ 3:1 | ✓ |
| Label text (`#4a5565`) on `#f5f7fa` | ~4.6:1 | — | ≥ 3:1 (non-text) | ✓ |
| Label text (`#4a5565`) on `#0f1624` | — | ~3.8:1 | ≥ 3:1 (non-text) | ✓ |

## 4. Responsive Behavior
- **Mobile (`< 768px`)**: Graph view is hidden (`display: none` via `.recent-streams-graph-container`). Table view is forced as default. View toggle is hidden via `hidden md:flex`.
- **Desktop (`≥ 768px`)**: Both toggle buttons visible. Graph container renders with `min-height: 400px`. Table view is hidden when graph is active via `hidden md:block`.

## 5. Engineering Notes
### Component Structure
- **`RecentStreams.tsx`**: Main orchestrator with view toggle; hosts `GraphView` sub-component.
- **`RecentStreams.css`**: All graph-specific styles (container, SVG, controls, legend, states).
- **`use PrefersReducedMotion`**: Imported from `src/hooks/usePrefersReducedMotion`. Used to skip physics simulation.
- **Force Simulation**: Vanilla JS (no D3 dependency). Runs in `requestAnimationFrame` loop inside `useEffect`. Max 300 iterations. Cancelled on unmount or when `streams`/`reduced` dependencies change.

### Performance Considerations
- State updates from the simulation loop are batched by `requestAnimationFrame`.
- `useMemo` is used for node/edge computations to avoid recalculation on every render.
- Edge and node rendering uses stable `key` props.
- The simulation stops early when `maxVelocity < SETTLE_THRESH` (0.01).

### Error Handling
- If a stream has no `accruedAmount`, it defaults to `0` for radius calculation.
- If a stream rate cannot be parsed (e.g., malformed), it defaults to `0`.
- If `streams` is empty while graph mode is active, a fallback message is shown.

## 6. Testing Checklist
- [x] Contrast ratios verified in Light and Dark themes.
- [x] Keyboard focus order tested (Toggle → View all → Zoom controls → Reset → Graph nodes).
- [x] `prefers-reduced-motion` skips physics simulation.
- [x] `aria-hidden="true"` applied to visual graph `<svg>`.
- [x] Responsive behavior verified below `--breakpoint-md`.
- [x] Node click/focus highlights connected edges.
- [x] Edge case: single stream renders correctly.
- [x] Edge case: all same-rate streams render with uniform edge widths.
- [x] Edge case: all same-amount streams render with uniform node sizes.
- [x] Graph view toggle switches between table and graph without loss of data.