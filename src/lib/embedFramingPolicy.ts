/**
 * Framing policy for the embed widget.
 *
 * An embed page is inside a cross-origin iframe, so it cannot read its parent's
 * origin directly. The only signals we have are:
 *
 * - Whether we are framed at all (`window.top !== window.self`)
 * - `document.referrer`, which the browser sets to the framing page URL but
 *   which a hostile page can suppress or control via a referrer `no-referrer`
 *   policy
 *
 * Because `document.referrer` alone is not an authorization signal, the widget
 * only renders sensitive content (balances, progress amounts, the timeline)
 * when the deployment explicitly allowlists the framing origin via
 * `VITE_EMBED_ALLOWED_ORIGINS` (comma-separated origins), in the same way
 * `embedMessagePolicy` treats it as authoritative for postMessage commands.
 *
 * Fail-closed rules:
 *
 * - Top-level page (not framed): trusted. No hostile frame wraps us.
 * - Framed + `VITE_EMBED_ALLOWED_ORIGINS` empty: NOT trusted. We cannot attest
 *   the host, so the widget degrades safely.
 * - Framed + referrer missing or opaque: NOT trusted, even with an allowlist.
 *   A missing referrer is not proof of anything.
 * - Framed + referrer matches an allowlisted origin: trusted.
 */

interface FramingEnv {
  readonly VITE_EMBED_ALLOWED_ORIGINS?: string;
}

/** Minimal window surface used by the policy so it is injectable in tests. */
export interface FramingWindowLike {
  top: unknown;
  self: unknown;
  location: { origin: string };
  document: { referrer: string };
}

export interface FramingContext {
  /** Whether this render may show balances, progress, and timeline figures. */
  trusted: boolean;
  /** Whether this document is embedded in a cross-document iframe. */
  isFramed: boolean;
  /** Origin of the page we believe is framing us, when determinable. */
  embedderOrigin: string | null;
}

function normalizeOrigin(value: string): string | null {
  try {
    const origin = new URL(value).origin;
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

/**
 * Origins explicitly allowlisted to frame the widget.
 *
 * Malformed entries are ignored rather than widening access. An empty set
 * means "no framing allowed": framed embeds fail closed and must degrade.
 */
export function getConfiguredEmbedOrigins(
  env: FramingEnv = import.meta.env
): Set<string> {
  const origins = new Set<string>();
  const raw = env.VITE_EMBED_ALLOWED_ORIGINS;
  if (!raw) return origins;
  for (const value of raw.split(",")) {
    const origin = normalizeOrigin(value.trim());
    if (origin) origins.add(origin);
  }
  return origins;
}

/**
 * Best-effort origin of the page hosting this document.
 *
 * A top-level document is its own host. A framed document derives the parent
 * origin from `document.referrer`; an empty or unparseable referrer yields
 * `null` (unknown), which callers must treat as untrusted.
 */
export function getEmbedderOrigin(win: FramingWindowLike = window): string | null {
  const isFramed = win.top !== win.self;
  if (!isFramed) {
    const origin = normalizeOrigin(win.location.origin);
    return origin ?? null;
  }
  if (!win.document.referrer) return null;
  return normalizeOrigin(win.document.referrer);
}

/**
 * Resolve whether this render is safe to show sensitive stream figures.
 *
 * Fails closed: any ambiguity (empty allowlist, missing referrer, unlisted
 * origin) produces `trusted: false`.
 */
export function getFramingContext(options?: {
  win?: FramingWindowLike;
  configuredOrigins?: Set<string>;
}): FramingContext {
  const win = options?.win ?? window;
  const configuredOrigins = options?.configuredOrigins ?? getConfiguredEmbedOrigins();

  const isFramed = win.top !== win.self;
  if (!isFramed) {
    return {
      trusted: true,
      isFramed: false,
      embedderOrigin: getEmbedderOrigin(win),
    };
  }

  const embedderOrigin = getEmbedderOrigin(win);
  const trusted =
    configuredOrigins.size > 0 &&
    embedderOrigin !== null &&
    configuredOrigins.has(embedderOrigin);

  return { trusted, isFramed: true, embedderOrigin };
}