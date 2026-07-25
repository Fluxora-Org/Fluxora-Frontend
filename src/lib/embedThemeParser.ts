/**
 * Embed Theme Parser
 * 
 * Secure parsing and validation of theme query parameters for embed widgets.
 * Prevents CSS injection and invalid values by strictly validating inputs.
 */

export type ThemeConfig = {
  theme: "light" | "dark" | null;
  accentColor: string | null;
};

const VALID_THEMES = ["light", "dark"] as const;
const VALID_HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Safely parse theme parameter from query string
 * 
 * Only accepts "light" or "dark". Any other value returns null.
 * Prevents injection via strict validation.
 */
export function parseThemeFromQuery(param: string | null): "light" | "dark" | null {
  if (!param) return null;
  
  const normalized = param.trim().toLowerCase();
  return VALID_THEMES.includes(normalized as any) ? normalized as "light" | "dark" : null;
}

/**
 * Safely parse and validate accent color from query string
 * 
 * Only accepts valid hex colors (#RRGGBB or #RGB).
 * Rejects: rgb(), hsl(), javascript:, data:, etc.
 * Returns null for any invalid input.
 */
export function parseAccentColorFromQuery(param: string | null): string | null {
  if (!param) return null;
  
  const trimmed = param.trim();
  
  // Reject any string containing parentheses (rgb(), hsl(), etc.)
  if (trimmed.includes('(') || trimmed.includes(')')) {
    return null;
  }
  
  // Reject any string containing semicolons or other dangerous patterns
  if (trimmed.includes(';') || trimmed.includes('url(') || trimmed.includes('javascript:')) {
    return null;
  }
  
  // Only accept valid hex colors
  if (VALID_HEX_COLOR_REGEX.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

/**
 * Validate that a CSS variable value is safe to inject
 * 
 * Used as an additional safety layer for dynamic styling.
 */
export function isValidCssVariableValue(value: string): boolean {
  // Reject dangerous patterns
  const dangerousPatterns = [
    'javascript:',
    'data:',
    'expression(',
    'eval(',
    'url(',
    '@import',
    '</style',
    '<script',
    '\\u',
    '\\x'
  ];
  
  for (const pattern of dangerousPatterns) {
    if (value.toLowerCase().includes(pattern)) {
      return false;
    }
  }
  
  // Additional safety: reject strings that could be interpreted as code.
  // A single CSS custom-property value never legitimately needs a `;` —
  // it's a declaration terminator, so its presence means the value could
  // smuggle in extra declarations when interpolated into an inline style.
  if (value.includes(';') || value.includes('{') || value.includes('}')) {
    return false;
  }
  
  return true;
}

/**
 * Apply theme configuration to document safely
 * 
 * This is a convenience function that applies validated theme config
 * to the document element with proper error handling.
 */
export function applyThemeConfigSafely(config: ThemeConfig): () => void {
  const html = document.documentElement;
  const originalTheme = html.getAttribute("data-theme");
  const originalAccentColor = html.style.getPropertyValue("--color-accent-primary");
  
  try {
    // Apply theme
    if (config.theme) {
      html.setAttribute("data-theme", config.theme);
    }
    
    // Apply accent color safely
    if (config.accentColor && isValidCssVariableValue(config.accentColor)) {
      html.style.setProperty("--color-accent-primary", config.accentColor);
      html.style.setProperty("--interactive-focus-ring", config.accentColor);
    }
  } catch (error) {
    // Silently fail - theme application errors shouldn't break the widget
    console.warn("Failed to apply theme configuration:", error);
  }
  
  // Return cleanup function
  return () => {
    try {
      // Restore original theme
      if (originalTheme) {
        html.setAttribute("data-theme", originalTheme);
      } else {
        html.removeAttribute("data-theme");
      }
      
      // Restore original accent color
      if (originalAccentColor) {
        html.style.setProperty("--color-accent-primary", originalAccentColor);
      } else {
        html.style.removeProperty("--color-accent-primary");
        html.style.removeProperty("--interactive-focus-ring");
      }
    } catch (error) {
      // Silently fail cleanup
      console.warn("Failed to restore original theme:", error);
    }
  };
}