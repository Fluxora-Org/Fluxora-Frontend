const MAX_MESSAGE_BYTES = 4096;
const MAX_RESIZE_WIDTH = 4000;
const MAX_RESIZE_HEIGHT = 2000;

export type EmbedMessage =
  | { type: "fluxora:embed"; version: 1; action: "resize"; width?: number; height?: number }
  | { type: "fluxora:embed"; version: 1; action: "theme"; theme: "light" | "dark" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getAllowedEmbedOrigins(): Set<string> {
  const origins = new Set<string>();
  const configuredOrigins = import.meta.env.VITE_EMBED_ALLOWED_ORIGINS;

  if (configuredOrigins) {
    for (const value of configuredOrigins.split(",")) {
      try {
        const origin = new URL(value.trim()).origin;
        if (origin !== "null") origins.add(origin);
      } catch {
        // Ignore malformed deployment configuration rather than widening access.
      }
    }
  }

  try {
    const referrerOrigin = document.referrer ? new URL(document.referrer).origin : "null";
    if (referrerOrigin !== "null") origins.add(referrerOrigin);
  } catch {
    // An invalid or opaque referrer is not an authorization signal.
  }

  if (window.top === window.self && window.location.origin !== "null") {
    origins.add(window.location.origin);
  }

  return origins;
}

export function parseEmbedMessage(data: unknown): EmbedMessage | null {
  let serialized: string;
  try {
    serialized = JSON.stringify(data);
  } catch {
    return null;
  }

  if (serialized.length > MAX_MESSAGE_BYTES || !isRecord(data)) return null;
  if (data.type !== "fluxora:embed" || data.version !== 1) return null;

  if (data.action === "theme" && (data.theme === "light" || data.theme === "dark")) {
    return { type: "fluxora:embed", version: 1, action: "theme", theme: data.theme };
  }

  if (data.action === "resize") {
    const hasWidth = data.width !== undefined;
    const hasHeight = data.height !== undefined;
    const widthValid = !hasWidth || (typeof data.width === "number" && Number.isFinite(data.width) && data.width >= 1 && data.width <= MAX_RESIZE_WIDTH);
    const heightValid = !hasHeight || (typeof data.height === "number" && Number.isFinite(data.height) && data.height >= 1 && data.height <= MAX_RESIZE_HEIGHT);
    if ((hasWidth || hasHeight) && widthValid && heightValid) {
      return {
        type: "fluxora:embed",
        version: 1,
        action: "resize",
        ...(hasWidth ? { width: data.width as number } : {}),
        ...(hasHeight ? { height: data.height as number } : {}),
      };
    }
  }

  return null;
}

export function isAuthorizedEmbedMessage(event: MessageEvent, allowedOrigins: Set<string>): boolean {
  return event.source === window.parent && event.origin !== "null" && allowedOrigins.has(event.origin);
}