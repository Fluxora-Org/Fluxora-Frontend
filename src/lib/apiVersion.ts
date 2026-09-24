/**
 * Frontend/backend compatibility contract.
 *
 * The current frontend consumes the v1 API contract. Patch and minor backend
 * releases remain compatible; a new major version requires a coordinated
 * frontend deployment.
 */
export const SUPPORTED_API_VERSION_RANGE = "1.x";
const SUPPORTED_API_VERSION = /^1(?:\.\d+){0,2}(?:[-+][0-9A-Za-z.-]+)?$/;

export type ApiVersionCheck =
  | { status: "compatible"; version: string }
  | { status: "incompatible"; version: string | null }
  | { status: "unavailable" };

export function isSupportedApiVersion(version: unknown): version is string {
  return typeof version === "string" && SUPPORTED_API_VERSION.test(version.trim());
}

function readVersion(payload: unknown): string | null {
  if (typeof payload === "string") return payload.trim() || null;
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as { version?: unknown }).version;
  return typeof value === "string" ? value.trim() || null : null;
}

/** Check the backend's explicit compatibility endpoint once during startup. */
export async function checkApiVersion(
  apiUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiVersionCheck> {
  const baseUrl = apiUrl.replace(/\/$/, "");
  try {
    const response = await fetchImpl(`${baseUrl}/version`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { status: "incompatible", version: null };

    const headerVersion = response.headers.get("x-fluxora-api-version");
    const payload = headerVersion ?? (await response.json());
    const version = readVersion(payload);
    return version && isSupportedApiVersion(version)
      ? { status: "compatible", version }
      : { status: "incompatible", version };
  } catch {
    // A transient outage is handled by the existing API request states. Do not
    // incorrectly tell users to update when no version was observed.
    return { status: "unavailable" };
  }
}
