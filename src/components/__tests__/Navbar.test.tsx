import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

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
