/**
 * ThemeEditorPanel
 * ────────────────
 * Admin UI for registering a branded custom theme.
 *
 * Accessibility contract (WCAG 2.1 AA):
 *   - All form fields are labelled via <label htmlFor>.
 *   - Contrast failures surface as role="alert" live regions.
 *   - Full keyboard operability: Tab/Shift-Tab through fields,
 *     Enter/Space to toggle preview, apply, and cancel.
 *   - Focus is trapped inside the panel (useModalAccessibility) with
 *     aria-modal="true" on the dialog container.
 *   - Colour pickers fall back to hex text inputs for keyboard entry.
 *   - prefers-reduced-motion: no animated transitions on token updates.
 *   - Responsive: single-column at 375 px, two-column at 768 px,
 *     side-by-side editor + preview at 1280 px.
 *
 * State machine (mirrors ThemeProvider):
 *   default → (edit) → custom-pending-preview → (apply) → custom-applied
 *                                             → (cancel) → default
 *   any → (invalid tokens) → invalid-override (errors shown inline)
 */

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useTheme } from "./ThemeProvider";
import { useModalAccessibility } from "../components/useModalAccessibility";
import {
  contrastRatio,
  isValidHex,
  normaliseHex,
  LOCKED_TOKEN_KEYS,
  CONTRAST_PAIRS,
  type AllowedTokenKey,
  type TokenValidationError,
} from "./contrastUtils";
import type { CustomThemeDefinition } from "./ThemeProvider";

// ─── Field metadata ───────────────────────────────────────────────────────────

interface TokenFieldMeta {
  key: AllowedTokenKey;
  label: string;
  group: "brand" | "cta" | "navbar" | "surface" | "text";
  hint: string;
  /** Token to compare against for contrast (foreground fields only). */
  contrastBg?: AllowedTokenKey;
}

const TOKEN_FIELDS: TokenFieldMeta[] = [
  // Brand
  {
    key: "--color-accent-primary",
    label: "Accent Primary",
    group: "brand",
    hint: "Main brand colour — links, active states, chart accents.",
    contrastBg: "--surface-base",
  },
  {
    key: "--color-accent-secondary",
    label: "Accent Secondary",
    group: "brand",
    hint: "Secondary brand colour — hover highlights, sparkline fill.",
    contrastBg: "--surface-base",
  },
  // CTA
  {
    key: "--color-cta-primary-bg",
    label: "CTA Background",
    group: "cta",
    hint: "Background of primary call-to-action buttons.",
  },
  {
    key: "--color-cta-primary-text",
    label: "CTA Text",
    group: "cta",
    hint: "Text colour inside primary CTA buttons. Must contrast 4.5:1 against CTA Background.",
    contrastBg: "--color-cta-primary-bg",
  },
  // Navbar
  {
    key: "--navbar-bg",
    label: "Navbar Background",
    group: "navbar",
    hint: "Top navigation bar background.",
  },
  {
    key: "--navbar-logo-color",
    label: "Navbar Logo / Brand Text",
    group: "navbar",
    hint: "Colour of the Fluxora wordmark. Must contrast 4.5:1 against Navbar Background.",
    contrastBg: "--navbar-bg",
  },
  {
    key: "--navbar-link-color",
    label: "Navbar Link Colour",
    group: "navbar",
    hint: "Navigation link text colour. Must contrast 4.5:1 against Navbar Background.",
    contrastBg: "--navbar-bg",
  },
  // Surfaces
  {
    key: "--surface-base",
    label: "Page Background",
    group: "surface",
    hint: "Root page/card background.",
  },
  {
    key: "--surface-neutral",
    label: "Card Surface",
    group: "surface",
    hint: "MetricCard and panel backgrounds.",
  },
  // Text
  {
    key: "--text-vivid",
    label: "Primary Text",
    group: "text",
    hint: "Headings and high-emphasis values.",
    contrastBg: "--surface-base",
  },
  {
    key: "--text-secondary",
    label: "Secondary Text",
    group: "text",
    hint: "Labels and supporting copy.",
    contrastBg: "--surface-base",
  },
];

const GROUP_LABELS: Record<TokenFieldMeta["group"], string> = {
  brand: "Brand Accent",
  cta: "Call to Action",
  navbar: "Navigation Bar",
  surface: "Surfaces",
  text: "Typography",
};

// ─── Defaults (Fluxora light theme) ──────────────────────────────────────────

const DEFAULTS: Partial<Record<AllowedTokenKey, string>> = {
  "--color-accent-primary": "#0097a7",   // 3.51:1 on white — passes AA-large (3:1)
  "--color-accent-secondary": "#00a884", // 3.03:1 on white — passes AA-large (3:1)
  "--color-cta-primary-bg": "#0097a7",
  "--color-cta-primary-text": "#04131a", // 12.8:1 on #0097a7 — passes AA (4.5:1)
  "--navbar-bg": "#ffffff",
  "--navbar-logo-color": "#1a1f36",      // 15.5:1 on white — passes AA (4.5:1)
  "--navbar-link-color": "#4a5565",      // 7.5:1 on white — passes AA (4.5:1)
  "--surface-base": "#ffffff",
  "--surface-neutral": "#fafbfc",
  "--text-vivid": "#1a1f36",             // 15.5:1 on white — passes AA (4.5:1)
  "--text-secondary": "#4a5565",         // 7.5:1 on white — passes AA (4.5:1)
};

// ─── Sub-component: ContrastBadge ─────────────────────────────────────────────

interface ContrastBadgeProps {
  ratio: number;
  required: number;
}

function ContrastBadge({ ratio, required }: ContrastBadgeProps) {
  const passes = ratio >= required;
  const formatted = ratio.toFixed(2);

  return (
    <span
      aria-label={`Contrast ratio ${formatted}:1 — ${passes ? "passes" : "fails"} WCAG AA`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "var(--radius-full, 9999px)",
        fontSize: "11px",
        fontWeight: 600,
        lineHeight: "16px",
        background: passes
          ? "var(--color-success-bg, rgba(16,185,129,0.15))"
          : "var(--color-danger-bg, rgba(239,68,68,0.12))",
        color: passes
          ? "var(--color-success, #10b981)"
          : "var(--color-danger, #ef4444)",
        border: `1px solid ${passes ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
        whiteSpace: "nowrap",
      }}
    >
      {passes ? "✓" : "✗"} {formatted}:1
    </span>
  );
}

// ─── Sub-component: ColorField ────────────────────────────────────────────────

interface ColorFieldProps {
  meta: TokenFieldMeta;
  value: string;
  allValues: Partial<Record<AllowedTokenKey, string>>;
  error?: TokenValidationError;
  onChange: (key: AllowedTokenKey, value: string) => void;
}

function ColorField({ meta, value, allValues, error, onChange }: ColorFieldProps) {
  const inputId = useId();
  const textId = useId();
  const errorId = useId();
  const descId = useId();

  // Compute live contrast when this is a foreground token.
  let contrastResult: { ratio: number; required: number } | null = null;
  if (meta.contrastBg) {
    const bgKey = meta.contrastBg as AllowedTokenKey;
    // Prefer the user's overridden bg value; fall back to the defaults map.
    const bgHex =
      allValues[bgKey] ??
      DEFAULTS[bgKey] ??
      "#ffffff";

    if (isValidHex(value) && isValidHex(bgHex)) {
      const required =
        CONTRAST_PAIRS.find((p) => p.fg === meta.key)?.level === "AA-large"
          ? 3.0
          : 4.5;
      contrastResult = {
        ratio: contrastRatio(normaliseHex(value), normaliseHex(bgHex)),
        required,
      };
    }
  }

  const isError = !!error || (contrastResult !== null && contrastResult.ratio < contrastResult.required);
  const errorMessage =
    error?.message ??
    (contrastResult && contrastResult.ratio < contrastResult.required
      ? `Contrast ${contrastResult.ratio.toFixed(2)}:1 — minimum ${contrastResult.required}:1 required (WCAG 2.1 AA). Choose a darker or lighter colour.`
      : undefined);

  return (
    <div
      role="group"
      aria-labelledby={inputId}
      style={{ display: "flex", flexDirection: "column", gap: "6px" }}
    >
      {/* Label row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <label
          id={inputId}
          htmlFor={textId}
          style={{
            font: "var(--font-label-md, 500 12px/16px sans-serif)",
            color: "var(--color-text-primary, #1a1f36)",
          }}
        >
          {meta.label}
        </label>
        {contrastResult && (
          <ContrastBadge ratio={contrastResult.ratio} required={contrastResult.required} />
        )}
      </div>

      {/* Input row: colour swatch + hex text input */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {/* Native colour picker — purely visual shortcut; hex input is the a11y control */}
        <input
          type="color"
          aria-hidden="true"
          tabIndex={-1}
          value={isValidHex(value) ? normaliseHex(value) : "#000000"}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(meta.key, e.target.value)
          }
          style={{
            width: "36px",
            height: "36px",
            padding: "2px",
            border: "1px solid var(--color-border-default, #e0e6ed)",
            borderRadius: "var(--radius-sm, 4px)",
            cursor: "pointer",
            background: "none",
            flexShrink: 0,
          }}
        />

        {/* Hex text input — primary accessible control */}
        <input
          id={textId}
          type="text"
          value={value}
          maxLength={7}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${descId}${isError ? ` ${errorId}` : ""}`}
          aria-invalid={isError ? "true" : undefined}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(meta.key, e.target.value)
          }
          placeholder="#RRGGBB"
          style={{
            flex: 1,
            height: "36px",
            padding: "0 10px",
            border: isError
              ? "1.5px solid var(--color-danger, #ef4444)"
              : "1px solid var(--color-border-default, #e0e6ed)",
            borderRadius: "var(--radius-sm, 4px)",
            background: "var(--color-bg-primary, #fff)",
            color: "var(--color-text-primary, #1a1f36)",
            font: "var(--font-mono-sm, 400 12px/16px monospace)",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow =
              "0 0 0 2px var(--color-bg-primary,#fff), 0 0 0 4px var(--focus-ring-color,#0ea5e9)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = "";
          }}
        />
      </div>

      {/* Hint */}
      <p
        id={descId}
        style={{
          margin: 0,
          font: "var(--font-body-sm, 400 12px/16px sans-serif)",
          color: "var(--color-text-muted, #6b7a94)",
        }}
      >
        {meta.hint}
      </p>

      {/* Error message — live region for screen readers */}
      {isError && errorMessage && (
        <p
          id={errorId}
          role="alert"
          aria-live="assertive"
          style={{
            margin: 0,
            font: "var(--font-body-sm, 400 12px/16px sans-serif)",
            color: "var(--color-danger, #ef4444)",
            display: "flex",
            gap: "4px",
            alignItems: "flex-start",
          }}
        >
          <span aria-hidden="true">⚠</span>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

// ─── Sub-component: PreviewStrip ──────────────────────────────────────────────

interface PreviewStripProps {
  values: Partial<Record<AllowedTokenKey, string>>;
}

/**
 * Inline preview of how key components look with the current draft tokens.
 * Uses inline CSS vars so it always reflects the live draft, not the applied theme.
 */
function PreviewStrip({ values }: PreviewStripProps) {
  const get = (key: AllowedTokenKey, fallback: string) =>
    values[key] && isValidHex(values[key]!) ? normaliseHex(values[key]!) : fallback;

  const navBg = get("--navbar-bg", "#ffffff");
  const navLogo = get("--navbar-logo-color", "#1a1f36");
  const navLink = get("--navbar-link-color", "#4a5565");
  const accentPrimary = get("--color-accent-primary", "#00b8d4");
  const accentSecondary = get("--color-accent-secondary", "#00d4aa");
  const ctaBg = get("--color-cta-primary-bg", "#00b8d4");
  const ctaText = get("--color-cta-primary-text", "#04131a");
  const surface = get("--surface-neutral", "#fafbfc");
  const surfaceBase = get("--surface-base", "#ffffff");
  const textPrimary = get("--text-vivid", "#1a1f36");
  const textSecondary = get("--text-secondary", "#4a5565");

  return (
    <div
      aria-label="Live theme preview"
      aria-live="polite"
      aria-atomic="true"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px",
        background: surfaceBase,
        borderRadius: "var(--radius-lg, 12px)",
        border: "1px solid var(--color-border-default, #e0e6ed)",
      }}
    >
      {/* Mini Navbar */}
      <div
        aria-label="Navbar preview"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderRadius: "var(--radius-md, 8px)",
          background: navBg,
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "15px", color: navLogo }}>
          Fluxora
        </span>
        <nav aria-label="Preview navigation" style={{ display: "flex", gap: "16px" }}>
          {["Dashboard", "Streams", "Recipient"].map((label) => (
            <span key={label} style={{ fontSize: "13px", fontWeight: 500, color: navLink }}>
              {label}
            </span>
          ))}
        </nav>
        <span
          style={{
            padding: "6px 14px",
            borderRadius: "9999px",
            background: ctaBg,
            color: ctaText,
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          Connect Wallet
        </span>
      </div>

      {/* MetricCard previews */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "12px",
        }}
      >
        {[
          { icon: "💰", label: "Total Streamed", value: "$124,500" },
          { icon: "⚡", label: "Active Streams", value: "12" },
        ].map((card) => (
          <div
            key={card.label}
            role="group"
            aria-label={`${card.label} metric preview`}
            style={{
              padding: "16px",
              borderRadius: "var(--radius-xl, 16px)",
              background: surface,
              border: "1px solid rgba(0,0,0,0.07)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <span style={{ fontSize: "20px" }} aria-hidden="true">{card.icon}</span>
            <span style={{ fontSize: "11px", fontWeight: 500, color: textSecondary }}>
              {card.label}
            </span>
            <span style={{ fontSize: "18px", fontWeight: 700, color: textPrimary }}>
              {card.value}
            </span>
          </div>
        ))}
      </div>

      {/* StatusPill previews */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} aria-label="Status pill previews">
        {[
          { label: "ACTIVE", bg: "rgba(30,201,142,0.2)", color: "#10b981" },
          { label: "PAUSED", bg: "rgba(245,158,11,0.2)", color: "#f59e0b" },
          { label: "COMPLETED", bg: "rgba(59,130,246,0.2)", color: "#3b82f6" },
        ].map((pill) => (
          <span
            key={pill.label}
            role="status"
            style={{
              padding: "3px 10px",
              borderRadius: "var(--radius-md, 8px)",
              fontSize: "11px",
              fontWeight: 600,
              background: pill.bg,
              color: pill.color,
            }}
          >
            {pill.label}
          </span>
        ))}
      </div>

      {/* Accent swatch */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }} aria-label="Accent colour swatches">
        <span style={{ fontSize: "11px", color: textSecondary }}>Brand accents:</span>
        {[
          { color: accentPrimary, label: "Accent primary" },
          { color: accentSecondary, label: "Accent secondary" },
          { color: ctaBg, label: "CTA background" },
        ].map((s) => (
          <span
            key={s.label}
            aria-label={s.label}
            title={`${s.label}: ${s.color}`}
            style={{
              display: "inline-block",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: s.color,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export { ColorField, ContrastBadge, PreviewStrip, TOKEN_FIELDS, GROUP_LABELS, DEFAULTS };
export type { TokenFieldMeta };

// ─── Main component ───────────────────────────────────────────────────────────

export interface ThemeEditorPanelProps {
  /** Called when the user dismisses the editor without applying. */
  onClose?: () => void;
}

/**
 * ThemeEditorPanel
 *
 * Admin surface for registering an org-branded custom theme.
 * Renders a form + live preview. Wires directly to useTheme().
 *
 * Keyboard walkthrough (via useModalAccessibility):
 *   Tab / Shift-Tab  — cycle through all form fields and buttons (focus trap)
 *   Enter / Space    — activate focused button
 *   Escape           — cancel preview and close (if onClose provided)
 *
 * Responsive breakpoints:
 *   ≤ 767 px   — stacked: form above preview
 *   768–1279 px — two-column grid (form left, preview right)
 *   ≥ 1280 px   — same two-column, wider preview column
 */
export default function ThemeEditorPanel({ onClose }: ThemeEditorPanelProps) {
  const {
    customTheme,
    customThemeState,
    registrationErrors,
    registerTheme,
    applyCustomTheme,
    clearCustomTheme,
  } = useTheme();

  const formRef = useRef<HTMLFormElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Local draft values — seeded from the current applied theme or defaults.
  const [draft, setDraft] = useState<Partial<Record<AllowedTokenKey, string>>>(
    () => ({
      ...DEFAULTS,
      ...(customTheme?.validatedTokens ?? {}),
    }),
  );
  const [label, setLabel] = useState<string>(customTheme?.label ?? "My Brand Theme");
  const [themeId, setThemeId] = useState<string>(customTheme?.id ?? "org-brand");

  // Track which fields have been touched for validation UX.
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const handleTokenChange = useCallback(
    (key: AllowedTokenKey, value: string) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
      setTouched((prev) => new Set(prev).add(key));
    },
    [],
  );

  const handlePreview = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const definition: CustomThemeDefinition = {
        id: themeId,
        label,
        tokenOverrides: draft as Partial<Record<AllowedTokenKey, string>>,
      };
      registerTheme(definition);
    },
    [themeId, label, draft, registerTheme],
  );

  const handleApply = useCallback(() => {
    applyCustomTheme();
  }, [applyCustomTheme]);

  const handleCancel = useCallback(() => {
    clearCustomTheme();
    onClose?.();
  }, [clearCustomTheme, onClose]);

  // Focus trap, Escape-to-cancel, and aria-modal handled by useModalAccessibility.
  useModalAccessibility({
    isOpen: true,
    onClose: handleCancel,
    modalRef: panelRef,
  });

  // Group fields.
  const fieldsByGroup = TOKEN_FIELDS.reduce<
    Record<string, TokenFieldMeta[]>
  >((acc, f) => {
    (acc[f.group] ??= []).push(f);
    return acc;
  }, {});

  const isPreviewing = customThemeState === "custom-pending-preview";
  const isApplied = customThemeState === "custom-applied";
  const hasErrors =
    customThemeState === "invalid-override" && registrationErrors.length > 0;

  const labelId = useId();
  const errSummaryId = useId();

  // Resolve locked token hint list for display.
  const lockedSample = LOCKED_TOKEN_KEYS.slice(0, 5);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      aria-describedby={hasErrors ? errSummaryId : undefined}
      ref={panelRef}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "24px",
        width: "100%",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <h2
            id={labelId}
            style={{
              margin: 0,
              font: "var(--font-heading-3, 600 18px/28px sans-serif)",
              color: "var(--color-text-primary, #1a1f36)",
            }}
          >
            Brand Theme Editor
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              font: "var(--font-body-sm, 400 12px/16px sans-serif)",
              color: "var(--color-text-muted, #6b7a94)",
            }}
          >
            Customise accent, CTA, and navbar colours for your organisation.
            Locked tokens (focus rings, status colours) cannot be changed to
            preserve accessibility.
          </p>
        </div>

        {/* Status badge */}
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{
            flexShrink: 0,
            padding: "4px 10px",
            borderRadius: "var(--radius-full, 9999px)",
            fontSize: "11px",
            fontWeight: 600,
            background: isApplied
              ? "var(--color-success-bg, rgba(16,185,129,0.15))"
              : isPreviewing
                ? "rgba(0,184,212,0.12)"
                : hasErrors
                  ? "var(--color-danger-bg, rgba(239,68,68,0.1))"
                  : "var(--color-surface-raised, #e8ecf1)",
            color: isApplied
              ? "var(--color-success, #10b981)"
              : isPreviewing
                ? "var(--color-accent-primary, #00b8d4)"
                : hasErrors
                  ? "var(--color-danger, #ef4444)"
                  : "var(--color-text-muted, #6b7a94)",
          }}
        >
          {isApplied
            ? "Applied"
            : isPreviewing
              ? "Preview active"
              : hasErrors
                ? "Errors"
                : "Default (Fluxora)"}
        </span>
      </div>

      {/* ── Error summary ────────────────────────────────────────────── */}
      {hasErrors && (
        <div
          id={errSummaryId}
          role="alert"
          aria-live="assertive"
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md, 8px)",
            background: "var(--color-danger-bg, rgba(239,68,68,0.1))",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "var(--color-danger, #ef4444)",
          }}
        >
          <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: "13px" }}>
            {registrationErrors.length} token override{registrationErrors.length > 1 ? "s" : ""} could not be applied:
          </p>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {registrationErrors.map((err) => (
              <li key={err.token}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Two-column layout: form + preview ───────────────────────── */}
      <div
        style={{
          display: "grid",
          /* Responsive: stacked on mobile, side-by-side from 768 px */
          gridTemplateColumns: "minmax(0,1fr)",
          gap: "24px",
        }}
        className="theme-editor-layout"
      >
        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handlePreview}
          aria-label="Custom theme form"
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >
          {/* Theme metadata */}
          <fieldset
            style={{
              margin: 0,
              padding: "16px",
              border: "1px solid var(--color-border-default, #e0e6ed)",
              borderRadius: "var(--radius-md, 8px)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <legend style={{ padding: "0 8px", font: "var(--font-label-md, 500 12px/16px sans-serif)", color: "var(--color-text-secondary, #4a5565)" }}>
              Theme Identity
            </legend>

            {/* Label */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                htmlFor="theme-label"
                style={{ font: "var(--font-label-md, 500 12px/16px sans-serif)", color: "var(--color-text-primary, #1a1f36)" }}
              >
                Display Name
              </label>
              <input
                id="theme-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Acme Corp Theme"
                required
                style={{
                  height: "36px",
                  padding: "0 10px",
                  border: "1px solid var(--color-border-default, #e0e6ed)",
                  borderRadius: "var(--radius-sm, 4px)",
                  background: "var(--color-bg-primary, #fff)",
                  color: "var(--color-text-primary, #1a1f36)",
                  font: "var(--font-body-md, 400 14px/20px sans-serif)",
                  outline: "none",
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-bg-primary,#fff), 0 0 0 4px var(--focus-ring-color,#0ea5e9)"; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = ""; }}
              />
            </div>

            {/* ID */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                htmlFor="theme-id"
                style={{ font: "var(--font-label-md, 500 12px/16px sans-serif)", color: "var(--color-text-primary, #1a1f36)" }}
              >
                Theme ID{" "}
                <span style={{ fontWeight: 400, color: "var(--color-text-muted, #6b7a94)" }}>
                  (slug, lowercase)
                </span>
              </label>
              <input
                id="theme-id"
                type="text"
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                placeholder="e.g. acme-corp"
                pattern="[a-z0-9_-]+"
                required
                style={{
                  height: "36px",
                  padding: "0 10px",
                  border: "1px solid var(--color-border-default, #e0e6ed)",
                  borderRadius: "var(--radius-sm, 4px)",
                  background: "var(--color-bg-primary, #fff)",
                  color: "var(--color-text-primary, #1a1f36)",
                  font: "var(--font-mono-sm, 400 12px/16px monospace)",
                  outline: "none",
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-bg-primary,#fff), 0 0 0 4px var(--focus-ring-color,#0ea5e9)"; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = ""; }}
              />
            </div>
          </fieldset>

          {/* Token groups */}
          {(Object.entries(fieldsByGroup) as [string, TokenFieldMeta[]][]).map(
            ([group, fields]) => (
              <fieldset
                key={group}
                style={{
                  margin: 0,
                  padding: "16px",
                  border: "1px solid var(--color-border-default, #e0e6ed)",
                  borderRadius: "var(--radius-md, 8px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <legend style={{ padding: "0 8px", font: "var(--font-label-md, 500 12px/16px sans-serif)", color: "var(--color-text-secondary, #4a5565)" }}>
                  {GROUP_LABELS[group as TokenFieldMeta["group"]] ?? group}
                </legend>

                {fields.map((field) => {
                  const fieldError = registrationErrors.find(
                    (e) => e.token === field.key,
                  );
                  return (
                    <ColorField
                      key={field.key}
                      meta={field}
                      value={draft[field.key] ?? DEFAULTS[field.key] ?? "#000000"}
                      allValues={draft}
                      error={touched.has(field.key) ? fieldError : undefined}
                      onChange={handleTokenChange}
                    />
                  );
                })}
              </fieldset>
            ),
          )}

          {/* Locked tokens info box */}
          <details
            style={{
              padding: "12px 16px",
              border: "1px solid var(--color-border-default, #e0e6ed)",
              borderRadius: "var(--radius-md, 8px)",
              font: "var(--font-body-sm, 400 12px/16px sans-serif)",
              color: "var(--color-text-muted, #6b7a94)",
            }}
          >
            <summary
              style={{ cursor: "pointer", fontWeight: 600, color: "var(--color-text-secondary, #4a5565)" }}
            >
              Locked tokens (accessibility-protected)
            </summary>
            <p style={{ margin: "8px 0 4px" }}>
              The following tokens are read-only and cannot be overridden. They
              ensure keyboard navigation visibility (WCAG 2.4.7) and status
              colour recognisability (WCAG 1.4.1).
            </p>
            <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "2px" }}>
              {lockedSample.map((t) => (
                <li key={t} style={{ fontFamily: "monospace" }}>{t}</li>
              ))}
              <li style={{ fontStyle: "italic" }}>
                … and {LOCKED_TOKEN_KEYS.length - lockedSample.length} more
              </li>
            </ul>
          </details>

          {/* Action buttons */}
          <div
            role="group"
            aria-label="Theme actions"
            style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
          >
            {/* Preview / re-preview */}
            <button
              type="submit"
              style={{
                flex: "1 1 auto",
                minHeight: "44px",
                padding: "0 20px",
                borderRadius: "var(--radius-md, 8px)",
                border: "none",
                background: "var(--color-cta-primary-bg, #00b8d4)",
                color: "var(--color-cta-primary-text, #04131a)",
                font: "var(--font-label-lg, 500 14px/20px sans-serif)",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-bg-primary,#fff), 0 0 0 4px var(--focus-ring-color,#0ea5e9)"; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = ""; }}
            >
              {isPreviewing ? "Update Preview" : "Preview Theme"}
            </button>

            {/* Apply (only when pending preview) */}
            {isPreviewing && (
              <button
                type="button"
                onClick={handleApply}
                style={{
                  flex: "1 1 auto",
                  minHeight: "44px",
                  padding: "0 20px",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "none",
                  background: "var(--color-success, #10b981)",
                  color: "#ffffff",
                  font: "var(--font-label-lg, 500 14px/20px sans-serif)",
                  fontWeight: 600,
                  cursor: "pointer",
                  outline: "none",
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-bg-primary,#fff), 0 0 0 4px var(--focus-ring-color,#0ea5e9)"; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = ""; }}
              >
                Apply &amp; Save
              </button>
            )}

            {/* Cancel / reset */}
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: "1 1 auto",
                minHeight: "44px",
                padding: "0 20px",
                borderRadius: "var(--radius-md, 8px)",
                border: "1px solid var(--color-border-default, #e0e6ed)",
                background: "var(--color-bg-primary, #fff)",
                color: "var(--color-text-secondary, #4a5565)",
                font: "var(--font-label-lg, 500 14px/20px sans-serif)",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-bg-primary,#fff), 0 0 0 4px var(--focus-ring-color,#0ea5e9)"; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = ""; }}
            >
              {isApplied || isPreviewing ? "Reset to Default" : "Cancel"}
            </button>
          </div>
        </form>

        {/* Live preview */}
        <div
          aria-label="Theme preview panel"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <p
            style={{
              margin: 0,
              font: "var(--font-label-md, 500 12px/16px sans-serif)",
              color: "var(--color-text-secondary, #4a5565)",
            }}
          >
            Live Preview
            <span
              style={{
                marginLeft: "8px",
                font: "var(--font-body-sm, 400 12px/16px sans-serif)",
                color: "var(--color-text-muted, #6b7a94)",
              }}
            >
              (updates as you type)
            </span>
          </p>
          <PreviewStrip values={draft} />
        </div>
      </div>

      {/* Responsive CSS injected as a style tag */}
      <style>{`
        .theme-editor-layout {
          grid-template-columns: minmax(0, 1fr);
        }
        @media (min-width: 768px) {
          .theme-editor-layout {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 1280px) {
          .theme-editor-layout {
            grid-template-columns: 1fr 1.4fr;
          }
        }
      `}</style>
    </div>
  );
}
