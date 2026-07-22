import { act, fireEvent, render, screen } from "@testing-library/react";
import { Profiler, type ProfilerOnRenderCallback } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "../Sidebar";
import {
  BREAKPOINT_MD,
  VIEWPORT_RESIZE_DEBOUNCE_MS,
  isMobileViewport,
} from "../../lib/breakpoints";

vi.mock("react-router-dom", () => ({
  NavLink: ({
    children,
    to,
    className,
    onClick,
  }: {
    children: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
    to: string;
    className?: string | ((props: { isActive: boolean }) => string);
    onClick?: () => void;
    end?: boolean;
  }) => {
    const isActive = to === "/app";
    return (
      <a
        href={to}
        className={typeof className === "function" ? className({ isActive }) : className}
        onClick={onClick}
      >
        {typeof children === "function" ? children({ isActive }) : children}
      </a>
    );
  },
  useNavigate: () => vi.fn(),
}));

let viewportWidth = BREAKPOINT_MD;

function setViewportWidth(width: number) {
  viewportWidth = width;
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    get: () => viewportWidth,
  });
}

function getSidebar() {
  const sidebar = document.getElementById("app-sidebar");
  expect(sidebar).toBeTruthy();
  return sidebar as HTMLElement;
}

function renderSidebar(mobileOpen = false, onRender?: ProfilerOnRenderCallback) {
  const sidebar = (
    <Sidebar
      collapsed={false}
      onToggleCollapse={vi.fn()}
      mobileOpen={mobileOpen}
      onMobileClose={vi.fn()}
    />
  );

  if (onRender) {
    return render(
      <Profiler id="sidebar" onRender={onRender}>
        {sidebar}
      </Profiler>,
    );
  }

  return render(sidebar);
}

describe("Sidebar design-token adoption", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the logo gradient from design-token CSS variables, not hardcoded hex", () => {
    setViewportWidth(BREAKPOINT_MD);
    const { container } = renderSidebar(false);

    const logo = container.querySelector<HTMLElement>(".bg-gradient-to-b");
    expect(logo).toBeTruthy();

    const className = logo!.className;
    // Token variables are referenced...
    expect(className).toContain("from-[var(--color-accent-primary)]");
    expect(className).toContain("to-[var(--color-accent-primary-dark)]");
    // ...and no raw hex colors remain.
    expect(className).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});

describe("isMobileViewport", () => {
  it("treats widths below BREAKPOINT_MD as mobile", () => {
    expect(isMobileViewport(BREAKPOINT_MD - 1)).toBe(true);
  });

  it("treats BREAKPOINT_MD and above as desktop", () => {
    expect(isMobileViewport(BREAKPOINT_MD)).toBe(false);
    expect(isMobileViewport(BREAKPOINT_MD + 1)).toBe(false);
  });
});

describe("Sidebar resize handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setViewportWidth(BREAKPOINT_MD);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reflects mobile aria-hidden when viewport crosses below the breakpoint", () => {
    setViewportWidth(BREAKPOINT_MD);
    renderSidebar(false);

    expect(getSidebar()).toHaveAttribute("aria-hidden", "false");

    setViewportWidth(BREAKPOINT_MD - 1);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS);
    });

    expect(getSidebar()).toHaveAttribute("aria-hidden", "true");
  });

  it("reflects desktop aria-hidden when viewport crosses above the breakpoint", () => {
    setViewportWidth(BREAKPOINT_MD - 1);
    renderSidebar(false);

    expect(getSidebar()).toHaveAttribute("aria-hidden", "true");

    setViewportWidth(BREAKPOINT_MD);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS);
    });

    expect(getSidebar()).toHaveAttribute("aria-hidden", "false");
  });

  it("debounces rapid resize events into a single state update", () => {
    setViewportWidth(BREAKPOINT_MD);
    let commitCount = 0;

    renderSidebar(false, () => {
      commitCount += 1;
    });
    const commitsAfterMount = commitCount;

    setViewportWidth(BREAKPOINT_MD - 1);
    act(() => {
      for (let width = BREAKPOINT_MD - 1; width >= BREAKPOINT_MD - 50; width -= 5) {
        setViewportWidth(width);
        window.dispatchEvent(new Event("resize"));
      }
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS - 1);
    });

    expect(getSidebar()).toHaveAttribute("aria-hidden", "false");

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(getSidebar()).toHaveAttribute("aria-hidden", "true");
    expect(commitCount).toBe(commitsAfterMount + 1);
  });

  it("keeps aria-hidden stable when debounced resize stays within mobile widths", () => {
    setViewportWidth(BREAKPOINT_MD - 100);
    renderSidebar(false);

    expect(getSidebar()).toHaveAttribute("aria-hidden", "true");

    act(() => {
      for (const width of [500, 520, 540, 560]) {
        setViewportWidth(width);
        window.dispatchEvent(new Event("resize"));
      }
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS);
    });

    expect(getSidebar()).toHaveAttribute("aria-hidden", "true");
  });

  it("removes the resize listener and pending debounce on unmount", () => {
    const removeListenerSpy = vi.spyOn(window, "removeEventListener");
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    setViewportWidth(BREAKPOINT_MD);
    const { unmount } = renderSidebar(false);

    setViewportWidth(BREAKPOINT_MD - 1);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(clearTimeoutSpy).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(VIEWPORT_RESIZE_DEBOUNCE_MS);
    });
  });

  it("keeps sidebar visible on mobile when the drawer is open", () => {
    setViewportWidth(BREAKPOINT_MD - 1);
    renderSidebar(true);

    expect(getSidebar()).toHaveAttribute("aria-hidden", "false");
  });
});

describe("Sidebar collapse toggle accessibility & keyboard interaction", () => {
  beforeEach(() => {
    setViewportWidth(BREAKPOINT_MD);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a real button with correct aria-expanded state and dynamic accessible name", () => {
    const onToggleCollapse = vi.fn();
    const { rerender } = render(
      <Sidebar
        collapsed={false}
        onToggleCollapse={onToggleCollapse}
        mobileOpen={false}
        onMobileClose={vi.fn()}
      />
    );

    const toggleButton = document.querySelector('button[aria-controls="app-sidebar"]');
    expect(toggleButton).toBeTruthy();
    expect(toggleButton?.tagName).toBe("BUTTON");
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    expect(toggleButton).toHaveAttribute("aria-label", "Collapse sidebar");

    rerender(
      <Sidebar
        collapsed={true}
        onToggleCollapse={onToggleCollapse}
        mobileOpen={false}
        onMobileClose={vi.fn()}
      />
    );

    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    expect(toggleButton).toHaveAttribute("aria-label", "Expand sidebar");
  });

  it("toggles sidebar on mouse click and keyboard activation (Enter/Space)", () => {
    const onToggleCollapse = vi.fn();
    render(
      <Sidebar
        collapsed={false}
        onToggleCollapse={onToggleCollapse}
        mobileOpen={false}
        onMobileClose={vi.fn()}
      />
    );

    const toggleButton = document.querySelector('button[aria-controls="app-sidebar"]') as HTMLButtonElement;
    expect(toggleButton).toBeTruthy();

    // Mouse click
    fireEvent.click(toggleButton);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);

    // Keyboard Enter
    fireEvent.keyDown(toggleButton, { key: "Enter", code: "Enter" });
    fireEvent.click(toggleButton);
    expect(onToggleCollapse).toHaveBeenCalledTimes(2);

    // Keyboard Space
    fireEvent.keyDown(toggleButton, { key: " ", code: "Space" });
    fireEvent.click(toggleButton);
    expect(onToggleCollapse).toHaveBeenCalledTimes(3);
  });

  it("maintains sane tab order in both expanded and collapsed states", () => {
    const { rerender } = render(
      <Sidebar
        collapsed={false}
        onToggleCollapse={vi.fn()}
        mobileOpen={false}
        onMobileClose={vi.fn()}
      />
    );

    const sidebar = getSidebar();
    const getFocusableItems = () =>
      Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");

    const expandedFocusables = getFocusableItems();
    expect(expandedFocusables.length).toBeGreaterThan(0);

    // Check expected sequence of focusable elements when expanded
    const expandedLabels = expandedFocusables.map(
      (el) => el.getAttribute("aria-label") || el.textContent?.trim()
    );
    expect(expandedLabels).toContain("Fluxora home");
    expect(expandedLabels).toContain("Collapse sidebar");

    // Rerender collapsed
    rerender(
      <Sidebar
        collapsed={true}
        onToggleCollapse={vi.fn()}
        mobileOpen={false}
        onMobileClose={vi.fn()}
      />
    );

    const collapsedFocusables = getFocusableItems();
    // In desktop view (hidden md:flex toggle button), all nav links, external links, logo and toggle button remain focusable in DOM
    expect(collapsedFocusables.length).toEqual(expandedFocusables.length);

    const collapsedLabels = collapsedFocusables.map(
      (el) => el.getAttribute("aria-label") || el.textContent?.trim()
    );
    expect(collapsedLabels).toContain("Fluxora home");
    expect(collapsedLabels).toContain("Expand sidebar");

    // Verify focus can move through each item without focus traps
    collapsedFocusables.forEach((el) => {
      el.focus();
      expect(document.activeElement).toBe(el);
    });
  });

  it("handles mobile drawer Escape key and focus trapping", () => {
    const onMobileClose = vi.fn();
    render(
      <Sidebar
        collapsed={false}
        onToggleCollapse={vi.fn()}
        mobileOpen={true}
        onMobileClose={onMobileClose}
      />
    );

    // Press Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onMobileClose).toHaveBeenCalledTimes(1);

    const sidebar = getSidebar();
    const focusables = sidebar.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusables[0];
    const middleEl = focusables[1];
    const lastEl = focusables[focusables.length - 1];

    // Non-Tab key does not interfere
    fireEvent.keyDown(window, { key: "Enter" });

    // Shift + Tab on middle element does not redirect focus to last element
    middleEl.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });

    // Shift + Tab on first element focuses last element
    firstEl.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(lastEl);

    // Tab on middle element does not redirect focus to first element
    middleEl.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: false });

    // Tab on last element focuses first element
    lastEl.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: false });
    expect(document.activeElement).toBe(firstEl);
  });

  it("triggers onMobileClose when logo, close button, backdrop, or nav links are clicked", () => {
    const onMobileClose = vi.fn();
    const { container } = render(
      <Sidebar
        collapsed={false}
        onToggleCollapse={vi.fn()}
        mobileOpen={true}
        onMobileClose={onMobileClose}
      />
    );

    // Logo click
    const logoButton = screen.getByRole("button", { name: "Fluxora home" });
    fireEvent.click(logoButton);
    expect(onMobileClose).toHaveBeenCalledTimes(1);

    // Mobile close button click
    const closeButton = screen.getByRole("button", { name: "Close sidebar" });
    fireEvent.click(closeButton);
    expect(onMobileClose).toHaveBeenCalledTimes(2);

    // Backdrop click
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(onMobileClose).toHaveBeenCalledTimes(3);

    // NavLink click
    const navLink = screen.getByRole("link", { name: /Dashboard/i });
    fireEvent.click(navLink);
    expect(onMobileClose).toHaveBeenCalledTimes(4);
  });
});


