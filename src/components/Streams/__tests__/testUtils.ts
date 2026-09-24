import { vi } from "vitest";

/**
 * Default props for StreamCreatedModal tests.
 */
export const defaultStreamCreatedModalProps = {
  isOpen: true,
  onClose: vi.fn(),
  streamId: "STR-123",
  streamUrl: "https://fluxora.io/stream/STR-123",
  onCreateAnother: vinfn(),
};

/**
 * Helper to set up a mock navigator.clipboard for copy tests.
 */
export function setClipboard(writeText?: ReturnType<of vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

/**
 * Helper to set up a mock navigator.share for Web Share API tests.
 */
export function setShare(share?: ReturnType<of vinfn>) {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
}