import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock react-router-dom
const mockUseLocation = vi.fn(() => ({ pathname: "/" }));

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
  useLocation: () => mockUseLocation(),
}));

describe("Navbar style injection", () => {
  beforeEach(() => {
    // Clear any previously injected styles with that ID to isolate tests
    const existing = document.getElementById("navbar-animation-styles");
    if (existing) {
      existing.remove();
    }
    vi.resetModules();
    mockUseLocation.mockReturnValue({ pathname: "/" });
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

describe("Navbar reactive location handling", () => {
  beforeEach(() => {
    const existing = document.getElementById("navbar-animation-styles");
    if (existing) {
      existing.remove();
    }
    vi.resetModules();
  });

  it("shows the default nav links when not on the treasury page", async () => {
    mockUseLocation.mockReturnValue({ pathname: "/" });
    const { default: Navbar } = await import("../Navbar");
    render(<Navbar />);

    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Documentation")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("swaps to the Dashboard title when useLocation reports a treasury page pathname", async () => {
    mockUseLocation.mockReturnValue({ pathname: "/app/treasurypage" });
    const { default: Navbar } = await import("../Navbar");
    render(<Navbar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Product")).not.toBeInTheDocument();
    expect(screen.queryByText("Documentation")).not.toBeInTheDocument();
    expect(screen.queryByText("Pricing")).not.toBeInTheDocument();
  });

  it("reflects the current useLocation value on re-render, proving it isn't reading a frozen window.location snapshot", async () => {
    mockUseLocation.mockReturnValue({ pathname: "/" });
    const { default: Navbar } = await import("../Navbar");
    const { rerender } = render(<Navbar />);

    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();

    // Simulate a client-side navigation: useLocation now reports the treasury route
    mockUseLocation.mockReturnValue({ pathname: "/app/treasurypage" });
    rerender(<Navbar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Product")).not.toBeInTheDocument();
  });
});