const MAX_MESSAGE_BYTES = 4096;
const MAX_RESIZE_WIDTH = 4000;
const MAX_RESIZE_HEIGHT = 2000;
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_NONCE_CACHE_SIZE = 1000;

export type EmbedMessage =
  | { type: "fluxora:embed"; version: 1; action: "resize"; width?: number; height?: number; nonce: string; timestamp: number }
  | { type: "fluxora:embed"; version: 1; action: "theme"; theme: "light" | "dark"; nonce: string; timestamp: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// In-memory nonce cache to prevent replay attacks
const nonceCache = new Map<string, number>();

function generateNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function isNonceValid(nonce: string, timestamp: number): boolean {
  const now = Date.now();
  
  // Check timestamp freshness
  if (timestamp < now - NONCE_TTL_MS || timestamp > now + NONCE_TTL_MS) {
    return false;
  }
  
  // Check if nonce was already used (replay protection)
  if (nonceCache.has(nonce)) {
    return false;
  }
  
  // Add nonce to cache with expiration
  nonceCache.set(nonce, timestamp);
  
  // Clean up expired nonces if cache is too large
  if (nonceCache.size > MAX_NONCE_CACHE_SIZE) {
    for (const [cachedNonce, cachedTimestamp] of nonceCache.entries()) {
      if (cachedTimestamp < now - NONCE_TTL_MS) {
        nonceCache.delete(cachedNonce);
      }
    }
  }
  
  return true;
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

  // Validate nonce and timestamp presence
  if (typeof data.nonce !== "string" || typeof data.timestamp !== "number" || !Number.isFinite(data.timestamp)) {
    return null;
  }

  // Validate nonce freshness and uniqueness
  if (!isNonceValid(data.nonce, data.timestamp)) {
    return null;
  }

  if (data.action === "theme" && (data.theme === "light" || data.theme === "dark")) {
    return { type: "fluxora:embed", version: 1, action: "theme", theme: data.theme, nonce: data.nonce, timestamp: data.timestamp };
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
        nonce: data.nonce,
        timestamp: data.timestamp,
      };
    }
  }

  return null;
}

export function isAuthorizedEmbedMessage(event: MessageEvent, allowedOrigins: Set<string>): boolean {
  return event.source === window.parent && event.origin !== "null" && allowedOrigins.has(event.origin);
}

export type ValidationResult = 
  | { valid: true }
  | { valid: false; reason: "untrusted_origin" | "invalid_source" | "invalid_schema" | "stale_message" | "replay_attack" | "missing_nonce" };

export function validateEmbedMessage(
  event: MessageEvent,
  allowedOrigins: Set<string>
): ValidationResult {
  // Check origin
  if (event.origin === "null" || !allowedOrigins.has(event.origin)) {
    return { valid: false, reason: "untrusted_origin" };
  }

  // Check source window
  if (event.source !== window.parent) {
    return { valid: false, reason: "invalid_source" };
  }

  // Parse and validate schema
  const message = parseEmbedMessage(event.data);
  if (!message) {
    // Determine specific schema failure without exposing payload
    const data = event.data;
    if (!isRecord(data)) {
      return { valid: false, reason: "invalid_schema" };
    }
    if (typeof data.nonce !== "string" || typeof data.timestamp !== "number") {
      return { valid: false, reason: "missing_nonce" };
    }
    if (typeof data.timestamp === "number") {
      const now = Date.now();
      if (data.timestamp < now - NONCE_TTL_MS || data.timestamp > now + NONCE_TTL_MS) {
        return { valid: false, reason: "stale_message" };
      }
    }
    if (typeof data.nonce === "string" && nonceCache.has(data.nonce)) {
      return { valid: false, reason: "replay_attack" };
    }
    return { valid: false, reason: "invalid_schema" };
  }

  return { valid: true };
}

// Export nonce generator for embed hosts to create valid messages
export { generateNonce };