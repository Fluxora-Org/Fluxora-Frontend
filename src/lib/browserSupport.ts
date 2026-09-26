/**
 * Minimum desktop browser versions supported by Fluxora. Keep these values in
 * sync with `vite.config.ts`; the build-target test enforces that contract.
 */
export const SUPPORTED_BROWSER_MATRIX = [
  { name: "Chrome", engine: "chrome", minimumVersion: "109" },
  { name: "Edge", engine: "edge", minimumVersion: "109" },
  { name: "Firefox", engine: "firefox", minimumVersion: "115" },
  { name: "Safari", engine: "safari", minimumVersion: "16.4" },
] as const;

/** esbuild targets corresponding to the minimum versions documented above. */
export const VITE_BUILD_TARGETS = SUPPORTED_BROWSER_MATRIX.map(
  ({ engine, minimumVersion }) => `${engine}${minimumVersion}`,
);

export function isSupportedBrowser(userAgent: string): boolean {
  const edge = userAgent.match(/Edg\/(\d+)/);
  if (edge) return Number(edge[1]) >= 109;

  const firefox = userAgent.match(/Firefox\/(\d+)/);
  if (firefox) return Number(firefox[1]) >= 115;

  // iOS Chrome uses the WebKit engine and follows the iOS OS version rather
  // than the Chrome release number, so classify it with Safari's baseline.
  const ios = userAgent.match(/OS (\d+)[._](\d+)/);
  if (/CriOS\//.test(userAgent) && ios) {
    return Number(ios[1]) > 16 || (Number(ios[1]) === 16 && Number(ios[2]) >= 4);
  }

  const chrome = userAgent.match(/(?:Chrome|Chromium)\/(\d+)/);
  if (chrome) return Number(chrome[1]) >= 109;

  const safari = userAgent.match(/Version\/(\d+(?:\.\d+)?).*Safari\//);
  if (safari) return Number(safari[1]) >= 16.4;

  return false;
}
