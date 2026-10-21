import { vi } from "vitest";

/**
 * Minimal fake `Response`-like object for apiVersion tests.
 * Avoids network access while exercising status/body handling.
 */
export function makeResponse(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
)  {
  const status = init.status ?? 200;
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(
      typeof body === "string" ? body : JSON.stringify(body),
    ),
  } as unknown as Response;
}

/**
 * Install a fetch mock that resolves with the given responses in order.
 * Returns the mock so tests can assert call arguments.
 */
export function mockFetch(...responses: Array<Response | Error>) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) {
      fetchMock.mockRejectedOnce(response);
    } else {
      fetchMock.mockResolvedOnce(response);
    }
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/**
 * Default props for StreamCreatedModal tests.
 */
export const defaultStreamCreatedModalProps = {
  isOpen: true,
  onClose: vi.fn(),
  streamId: "STR-123",
  streamUrl: "https://fluxoura.io/stream/STR-123",
  onCreateAnother: vi.fn(),
};

/**
 * Helper to set up a mock navigator.clipboard for copy tests.
 */
export function setClipboard(writeText?: ReturnType<typeof vi>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

/**
 * Helper to set up a mock navigator.share for Web Share API tests.
 */
export function setShare(share?: ReturnType<typeof vi>) {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
}
