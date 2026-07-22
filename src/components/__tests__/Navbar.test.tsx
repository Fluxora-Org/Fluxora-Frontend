import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import {
  BREAKPOINT_MD,
  VIEWPORT_RESIZE_DEBOUNCE_MS,
} from "../../lib/breakpoints";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.PropsWithChildren<{ to: string; [key: string]: unknown }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/" }),
}));

let viewportWidth = BREAKPOINT_MD;

function setViewportWidth(width: number) {
  viewportWidth = width;
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    get: () => viewportWidth,
  });
}

describe("Navbar style injection", () => {
  beforeEach(() => {
    // Clear any previously injected styles with that ID to isolate tests
    const existing = document.getElementById("navbar-animation-styles");
    if (existing) {
      existing.remove();
    }
    vi.resetModules();
  });

  it("first mount injects one style element with correct keyframes", async () => {
    // Dynamically import Navbar to trigger module evaluation
    const { default: Navbar } = await import("../Navbar");
    render(<Navbar />);

    const styles = document.querySelectorAll("style[id='navbar-animation-styles']");
    expect(styles).toHaveLength(1);

    const styleElement = styles[0];
    expect(styleElement.textContent).toContain("@keyframes slideDown");
  });

  it("subsequent mounts do not inject duplicates", async () => {
    const { default: Navbar } = await import("../Navbar");
    
    // First render
    const { unmount } = render(<Navbar />);
    expect(document.querySelectorAll("style[id='navbar-animation-styles']")).toHaveLength(1);

    // Unmount and mount again
    unmount();
    render(<Navbar />);
    expect(document.querySelectorAll("style[id='navbar-animation-styles']")).toHaveLength(1);
  });

  it("module re-evaluation (like HMR/resets) does not duplicate the style element", async () => {
    // Load once
    const { default: Navbar1 } = await import("../Navbar");
    render(<Navbar1 />);
    expect(document.querySelectorAll("style[id='navbar-animation-styles']")).toHaveLength(1);

    // Reset module cache and import again
    vi.resetModules();
    const { default: Navbar2 } = await import("../Navbar");
    render(<Navbar2 />);
    
    // Should still have exactly 1 style element
    expect(document.querySelectorAll("style[id='navbar-animation-styles']")).toHaveLength(1);
  });

  it("repeated mount/unmount cycles do not create additional style elements", async () => {
    const { default: Navbar } = await import("../Navbar");

    for (let i = 0; i < 5; i++) {
      const { unmount } = render(<Navbar />);
      expect(document.querySelectorAll("style[id='navbar-animation-styles']")).toHaveLength(1);
      unmount();
    }
    expect(document.querySelectorAll("style[id='navbar-animation-styles']")).toHaveLength(1);
  });
});

describe("Navbar resize handling", () => {
  beforeEach(() => {
    const existing = document.getElementById("navbar-animation-styles");
    if (existing) {
      existing.remove();
    }
    vi.resetModules();
    vi.useFakeTimers();
    setViewportWidth(BREAKPOINT_MD);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function getHamburger(container: HTMLElement) {
    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle navigation menu"]',
    );
    expect(button).toBeTruthy();
    return button as HTMLButtonElement;
  }

  it("updates the mobile hamburger only after the debounce delay elapses", async () => {
    setViewportWidth(BREAKPOINT_MD);
    const { default: Navbar } = await import("../Navbar");
    const { container } = render(<Navbar />);

    // Desktop width => hamburger hidden.
    expect(getHamburger(container).style.display).toBe("none");

    setViewportWidth(BREAKPOINT_MD - 1);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS - 1);
    });

    // Debounce still pending -> no state update yet.
    expect(getHamburger(container).style.display).toBe("none");

    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Debounce elapsed -> mobile state applied.
    expect(getHamburger(container).style.display).toBe("flex");
  });

  it("collapses rapid resize events into a single debounced update", async () => {
    setViewportWidth(BREAKPOINT_MD - 1);
    const { default: Navbar } = await import("../Navbar");
    const { container } = render(<Navbar />);

    // Mobile at mount => hamburger visible.
    expect(getHamburger(container).style.display).toBe("flex");

    act(() => {
      for (let width = BREAKPOINT_MD; width <= BREAKPOINT_MD + 50; width += 5) {
        setViewportWidth(width);
        window.dispatchEvent(new Event("resize"));
      }
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS - 1);
    });

    // Every intermediate event reset the timer; nothing has committed yet.
    expect(getHamburger(container).style.display).toBe("flex");

    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Only the final width (desktop) is reflected, once.
    expect(getHamburger(container).style.display).toBe("none");
  });

  it("clears the pending debounce timer on unmount", async () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    setViewportWidth(BREAKPOINT_MD);
    const { default: Navbar } = await import("../Navbar");
    const { unmount } = render(<Navbar />);

    setViewportWidth(BREAKPOINT_MD - 1);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    // A trailing flush after unmount must not throw or update anything.
    act(() => {
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS);
    });
  });
});
