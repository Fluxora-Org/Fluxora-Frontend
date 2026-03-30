/**
 * Typography Scale - Unified token library for Fluxora-Frontend
 * All text sizing and styling derives from this source.
 * Reference in code or design docs for consistency.
 */

export const typographyScale = {
  // Display (landing hero)
  displayLarge: {
    fontSize: "56px",
    lineHeight: "1.2",
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  displayMedium: {
    fontSize: "48px",
    lineHeight: "1.25",
    fontWeight: 700,
    letterSpacing: "-0.015em",
  },

  // Heading (section/page titles)
  headingLarge: {
    fontSize: "32px",
    lineHeight: "1.3",
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  headingMedium: {
    fontSize: "24px",
    lineHeight: "1.35",
    fontWeight: 700,
    letterSpacing: "0em",
  },
  headingSmall: {
    fontSize: "20px",
    lineHeight: "1.4",
    fontWeight: 600,
    letterSpacing: "0.01em",
  },

  // Body (main content text)
  bodyLarge: {
    fontSize: "16px",
    lineHeight: "1.5",
    fontWeight: 400,
    letterSpacing: "0em",
  },
  bodyMedium: {
    fontSize: "14px",
    lineHeight: "1.5",
    fontWeight: 400,
    letterSpacing: "0.01em",
  },
  bodySmall: {
    fontSize: "12px",
    lineHeight: "1.5",
    fontWeight: 400,
    letterSpacing: "0.01em",
  },

  // Label (UI chrome: buttons, badges, tabs)
  labelLarge: {
    fontSize: "14px",
    lineHeight: "1.4",
    fontWeight: 600,
    letterSpacing: "0.01em",
  },
  labelMedium: {
    fontSize: "12px",
    lineHeight: "1.4",
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
  labelSmall: {
    fontSize: "11px",
    lineHeight: "1.4",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
} as const;

/**
 * CSSProperties helper for easy JSX application
 * Usage: <div style={getTypography('headingLarge')}>Title</div>
 */
export function getTypography(
  scale: keyof typeof typographyScale
): React.CSSProperties {
  const style = typographyScale[scale];
  return {
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
  } as React.CSSProperties;
}
