import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { announceToScreenReader, useEmbedAccessibility } from "../useEmbedAccessibility";

function TestWidget({ title }: { title: string }) {
  useEmbedAccessibility({ title, description: "Widget description", isMainContent: true });
  return <div data-testid={`widget-${title}`} />;
}

describe("useEmbedAccessibility announcer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("keeps each widget instance isolated from other live-region announcers", () => {
    const { unmount: unmountFirst } = render(<TestWidget title="First" />);
    const { unmount: unmountSecond } = render(<TestWidget title="Second" />);

    const initialAnnouncers = document.querySelectorAll('[aria-live="polite"]');
    expect(initialAnnouncers).toHaveLength(2);

    const firstMessage = "Stream widget: First";
    const secondMessage = "Stream widget: Second";

    const firstNode = initialAnnouncers[0] as HTMLElement;
    const secondNode = initialAnnouncers[1] as HTMLElement;
    expect(firstNode.textContent).toBe(firstMessage);
    expect(secondNode.textContent).toBe(secondMessage);
    expect(firstNode.id).not.toBe(secondNode.id);

    unmountFirst();
    unmountSecond();

    expect(document.querySelectorAll('[aria-live="polite"]').length).toBe(0);
  });
});
