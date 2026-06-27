import { act, render } from "@testing-library/react";
import { Profiler } from "react";
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
  }) => (
    <a
      href={to}
      className={typeof className === "function" ? className({ isActive: false }) : className}
      onClick={onClick}
    >
      {typeof children === "function" ? children({ isActive: false }) : children}
    </a>
  ),
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

function renderSidebar(mobileOpen = false, onRender?: Profiler.OnRenderCallback) {
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
