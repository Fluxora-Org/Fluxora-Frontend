/**
 * ColorBlindToggle
 * ─────────────────
 * Developer / design-QA affordance for selecting a colour-blind simulation
 * preset on the Treasury overview.
 *
 * ## Accessibility
 * - Rendered as a `<fieldset>` / `<legend>` radio group (WCAG 1.3.1, 4.1.2).
 * - Each radio button is keyboard-operable (arrow keys cycle presets).
 * - Selecting a filter triggers a polite ARIA live-region announcement
 *   via `useLiveAnnouncer` so screen-reader users know which simulation is
 *   active.
 * - Visible focus ring follows the design-token focus system.
 * - Component is visually distinct (dev-mode banner styling) so it is not
 *   mistaken for a shipped end-user control.
 *
 * ## Usage
 * ```tsx
 * // Wrap the relevant page section:
 * <ColorBlindSimulationProvider>
 *   <ColorBlindToggle />
 *   <TreasuryMetrics />
 * </ColorBlindSimulationProvider>
 * ```
 */

import { useId } from "react";
import "./ColorBlindToggle.css";
import { useLiveAnnouncer } from "../../hooks/useLiveAnnouncer";
import {
  useColorBlindSimulation,
  SIMULATION_LABELS,
  type SimulationMode,
} from "./ColorBlindSimulationProvider";

const SIMULATION_MODES: SimulationMode[] = [
  "none",
  "protanopia",
  "deuteranopia",
  "tritanopia",
];

export default function ColorBlindToggle() {
  const { simulation, setSimulation } = useColorBlindSimulation();
  const { announcement, announce } = useLiveAnnouncer();
  const groupId = useId();

  function handleChange(mode: SimulationMode) {
    setSimulation(mode);
    announce(
      mode === "none"
        ? "Colour-blind simulation off"
        : `Colour-blind simulation: ${SIMULATION_LABELS[mode]}`,
    );
  }

  return (
    <div
      role="region"
      aria-label="Colour-blind simulation controls"
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: "var(--space-sm)",
        padding: "var(--space-md) var(--space-lg)",
        background: "var(--color-surface-elevated)",
        border: "1px dashed var(--color-border-secondary)",
        borderRadius: "var(--radius-md)",
        // Slightly subdued so it reads as a dev tool, not page content.
        opacity: 0.92,
      }}
      data-testid="colorblind-toggle"
    >
      {/* Dev-mode label */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-xs)",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          userSelect: "none",
        }}
        aria-hidden="true"
      >
        {/* Eye icon inline SVG — aria-hidden on parent, purely decorative */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable={false}
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Design QA · Colour Simulation
      </span>

      {/* Radio group */}
      <fieldset
        style={{
          border: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-sm)",
        }}
      >
        <legend
          style={{
            // visually hidden but kept in the accessibility tree
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
          }}
        >
          Colour-blind simulation preset
        </legend>

        {SIMULATION_MODES.map((mode) => {
          const inputId = `${groupId}-${mode}`;
          const isSelected = simulation === mode;

          return (
            <label
              key={mode}
              htmlFor={inputId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-xs)",
                padding: "4px var(--space-md)",
                borderRadius: "var(--radius-full)",
                border: `1px solid ${isSelected ? "var(--color-accent-primary)" : "var(--color-border-default)"}`,
                background: isSelected
                  ? "color-mix(in srgb, var(--color-accent-primary) 12%, transparent)"
                  : "var(--color-surface-default)",
                color: isSelected
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                fontSize: "12px",
                fontWeight: isSelected ? 600 : 400,
                cursor: "pointer",
                transition:
                  "border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast)",
                // Allow the label itself to receive focus rings when
                // the inner radio is focused.
                outline: "none",
              }}
            >
              <input
                id={inputId}
                type="radio"
                name={`${groupId}-simulation`}
                value={mode}
                checked={isSelected}
                onChange={() => handleChange(mode)}
                style={{
                  // Visually hidden but keyboard-operable and accessible.
                  position: "absolute",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                  whiteSpace: "nowrap",
                  margin: 0,
                  // When focused, the *label* shows the focus ring via :focus-within.
                }}
                aria-label={SIMULATION_LABELS[mode]}
              />
              {/* Visual indicator dot */}
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isSelected
                    ? "var(--color-accent-primary)"
                    : "var(--color-border-secondary)",
                  flexShrink: 0,
                }}
              />
              {modeShortLabel(mode)}
            </label>
          );
        })}
      </fieldset>

      {/* Active filter description — visible when simulating */}
      {simulation !== "none" && (
        <p
          style={{
            margin: 0,
            fontSize: "11px",
            color: "var(--color-text-muted)",
          }}
          aria-live="off"
          data-testid="active-filter-description"
        >
          Previewing: <strong>{SIMULATION_LABELS[simulation]}</strong>. Status
          distinctions should remain legible via icon + text label, not colour
          alone.
        </p>
      )}

      {/* Polite ARIA live region for screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        {announcement}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Short label for the toggle chip (fits the compact pill). */
function modeShortLabel(mode: SimulationMode): string {
  switch (mode) {
    case "none":
      return "Off";
    case "protanopia":
      return "Protanopia";
    case "deuteranopia":
      return "Deuteranopia";
    case "tritanopia":
      return "Tritanopia";
  }
}
