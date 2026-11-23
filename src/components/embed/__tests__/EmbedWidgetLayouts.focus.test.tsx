import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";
import {
  EmbedWidgetLayoutCard,
  EmbedWidgetLayoutBanner,
  EmbedWidgetLayoutCompact,
} from "../EmbedWidgetLayouts";
import { useEmbedAccessibility } from "../../../hooks/useEmbedAccessibility";

// Mock StreamTimeline to avoid testing it here
vi.mock("../../StreamTimeline", () => ({
  default: ({ status }: { status: string }) => (
    <div data-testid="stream-timeline" data-status={status}>
      Mock Stream Timeline
    </div>
  ),
}));

const mockStream = {
  id: "STR-001",
  name: "Test Stream",
  recipientName: "Test Recipient",
  recipientAddress: "GA...",
  treasuryName: "Test Treasury",
  treasuryAddress: "GA...",
  asset: "USDC",
  status: "Active" as const,
  monthlyRate: 5000,
  depositAmount: 48000,
  streamedAmount: 19250,
  withdrawableAmount: 4200,
  remainingAmount: 28750,
  progress: 40,
  startDate: "2026-01-15",
  endDate: "2026-10-15",
  cliffDate: "2026-01-31",
  nextUnlockDate: "2026-04-03",
  summary: "Test stream summary",
  health: "Healthy" as const,
  healthNote: "Healthy stream",
  auditNote: "No issues",
  tags: ["test"],
  timeline: [],
};

const mockThemeConfig = {
  theme: "light" as const,
  accentColor: null,
};

type LayoutComponent = (props: {
  stream: typeof mockStream;
  currentDate: string;
  themeConfig: typeof mockThemeConfig;
}) => JSX.Element;

const commonProps = {
  stream: mockStream,
  currentDate: "2026-01-20",
  themeConfig: mockThemeConfig,
};

const layouts: Array<[string, LayoutComponent]> = [
  ["card", EmbedWidgetLayoutCard],
  ["banner", EmbedWidgetLayoutBanner],
  ["compact", EmbedWidgetLayoutCompact],
];

/**
 * Harness that wires the real embed accessibility hook to a layout, exactly
 * like the embed page does (`EmbedStreamWidget` calls `useEmbedAccessibility`
 * around the widget container).
 */
function EmbedHarness({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  useEmbedAccessibility({ title, isMainContent: true });
  return <>{children}</>;
}

describe("Embed widget keyboard focus contract (browser-level)", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  /**
   * Renders a layout inside the accessibility harness with a same-document
   * "host page" trigger focused beforehand, simulating a widget opened from
   * the host page (e.g. an embed preview or an in-app mount).
   */
  const renderWithHostTrigger = (
    ui: React.ReactElement,
    title = "Test Stream"
  ) => {
    const origin = document.createElement("button");
    origin.textContent = "Host page trigger";
    document.body.appendChild(origin);
    origin.focus();

    const result = render(<EmbedHarness title={title}>{ui}</EmbedHarness>);
    return { origin, ...result };
  };

  // -----------------------------------------------------------------------
  // Focus entry: keyboard focus lands on the widget container in each
  // supported layout, and the widget's accessible name is announced.
  // -----------------------------------------------------------------------
  describe("focus entry", () => {
    it.each(layouts)(
      "focus enters the %s layout container on mount",
      (_name, Layout) => {
        renderWithHostTrigger(<Layout {...commonProps} />);

        const article = screen.getByRole("article");
        expect(article).toHaveAttribute("tabindex", "-1");
        expect(document.activeElement).toBe(article);

        // Screen-reader label: the entry announcement matches the accessible
        // name on the container.
        expect(article).toHaveAttribute("aria-label", "Stream widget: Test Stream");
        const announcer = document.querySelector('[aria-live="polite"]');
        expect(announcer?.textContent).toContain("Stream widget: Test Stream");
      }
    );

    it("focus enters the error container when the widget fails to load", () => {
      render(
        <EmbedHarness title="Fluxora Stream Widget">
          <div
            role="alert"
            aria-live="assertive"
            data-testid="embed-error-state"
          >
            <span>Stream unavailable: Stream not found</span>
            <button>Try again</button>
          </div>
        </EmbedHarness>
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("tabindex", "-1");
      expect(document.activeElement).toBe(alert);

      // The retry control is the first focusable inside the error container,
      // reachable in natural DOM order with a single Tab from the container.
      const focusable = alert.querySelectorAll("button");
      expect(focusable).toHaveLength(1);
      expect(focusable[0]).toBe(screen.getByRole("button", { name: "Try again" }));
    });
  });

  // -----------------------------------------------------------------------
  // Focus exit: Escape restores focus to the element that owned it before
  // the widget (same-document embeds), and announces exit guidance when
  // there is no same-document origin (iframe-like context).
  // -----------------------------------------------------------------------
  describe("focus exit and restoration", () => {
    it.each(layouts)(
      "Escape restores focus to the host trigger from the %s layout",
      (_name, Layout) => {
        const { origin } = renderWithHostTrigger(<Layout {...commonProps} />);

        expect(document.activeElement).toBe(screen.getByRole("article"));

        fireEvent.keyDown(document, { key: "Escape" });

        expect(document.activeElement).toBe(origin);
      }
    );

    it.each(layouts)(
      "Escape in the %s layout announces exit guidance when there is no host origin",
      (_name, Layout) => {
        // No element focused before mount → iframe-like context.
        render(<EmbedHarness title="Test Stream"><Layout {...commonProps} /></EmbedHarness>);

        const article = screen.getByRole("article");
        expect(document.activeElement).toBe(article);

        fireEvent.keyDown(document, { key: "Escape" });

        // Focus stays on the container and the user is told how to leave.
        expect(document.activeElement).toBe(article);
        const announcer = document.querySelector('[aria-live="polite"]');
        expect(announcer?.textContent).toContain(
          "Press Tab to return to the host page"
        );
      }
    );

    it("focus returns to the host trigger when the widget unmounts", () => {
      const { origin, unmount } = renderWithHostTrigger(
        <EmbedWidgetLayoutCard {...commonProps} />
      );

      expect(document.activeElement).toBe(screen.getByRole("article"));

      unmount();

      expect(document.activeElement).toBe(origin);
    });
  });

  // -----------------------------------------------------------------------
  // Tab boundary: the widget is not a hard focus trap — Tab keypresses are
  // left to the browser so focus can exit the widget to the host page.
  // -----------------------------------------------------------------------
  describe("tab boundary", () => {
    it("does not intercept Tab from the focused container", () => {
      renderWithHostTrigger(<EmbedWidgetLayoutCard {...commonProps} />);
      const article = screen.getByRole("article");
      article.focus();

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
      });
      const preventDefaultSpy = vi.spyOn(tabEvent, "preventDefault");
      document.dispatchEvent(tabEvent);

      // The embed widget never traps focus: the browser owns the iframe
      // boundary and moves focus back to the host page.
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(article);
    });
  });

  // -----------------------------------------------------------------------
  // Keyboard-only operability: entry, deterministic tab order, containment
  // (no drop to body), graceful Escape exit, and visible focus.
  // -----------------------------------------------------------------------
  describe("keyboard operability alone", () => {
    it("entry: focus programmatically enters the widget root container", () => {
      renderWithHostTrigger(<EmbedWidgetLayoutCard {...commonProps} />);

      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("tabindex", "-1");
      expect(document.activeElement).toBe(article);
      // Keyboard users are not stranded on the host page or body.
      expect(document.activeElement).not.toBe(document.body);
    });

    it("tab order: deterministic sequential navigation container -> interactive controls", async () => {
      const user = userEvent.setup();
      render(
        <EmbedHarness title="Fluxora Stream Widget">
          <div
            role="alert"
            aria-live="assertive"
            data-testid="embed-error-state"
          >
            <span>Stream unavailable: Stream not found</span>
            <button>Try again</button>
          </div>
        </EmbedHarness>
      );

      const alert = screen.getByRole("alert");
      // Entry lands on the container first.
      expect(document.activeElement).toBe(alert);

      // Every interactive element is enumerated in DOM order with no
      // positive-tabindex hacks that would break sequential navigation.
      const focusable = Array.from(
        alert.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      expect(focusable).toHaveLength(1);
      const retry = screen.getByRole("button", { name: "Try again" });
      expect(focusable[0]).toBe(retry);
      expect(retry.tabIndex).toBe(0);
      expect(retry.hasAttribute("disabled")).toBe(false);
      focusable.forEach((el) => {
        expect((el as HTMLElement).tabIndex).toBeLessThanOrEqual(0);
      });

      // Sequential keyboard navigation: container -> Try again.
      await user.tab();
      expect(retry).toHaveFocus();
      expect(document.activeElement).not.toBe(document.body);
    });

    it("containment: focus never drops to body and Escape restores the host trigger", async () => {
      const user = userEvent.setup();
      const { origin } = renderWithHostTrigger(
        <EmbedHarness title="Fluxora Stream Widget">
          <div role="alert" data-testid="embed-error-state">
            <span>Stream unavailable</span>
            <button>Try again</button>
          </div>
        </EmbedHarness>
      );

      const alert = screen.getByRole("alert");
      const retry = screen.getByRole("button", { name: "Try again" });
      expect(document.activeElement).toBe(alert);
      expect(document.activeElement).not.toBe(document.body);

      await user.tab();
      expect(retry).toHaveFocus();
      expect(document.activeElement).not.toBe(document.body);

      // Graceful exit per useEmbedAccessibility contract: Escape restores
      // focus to the element that owned it before the widget took it.
      await user.keyboard("{Escape}");
      expect(origin).toHaveFocus();
      expect(document.activeElement).not.toBe(document.body);
    });

    it("containment: Escape without a host origin keeps focus inside and announces exit", async () => {
      const user = userEvent.setup();
      render(
        <EmbedHarness title="Test Stream">
          <EmbedWidgetLayoutCard {...commonProps} />
        </EmbedHarness>
      );

      const article = screen.getByRole("article");
      expect(document.activeElement).toBe(article);

      await user.keyboard("{Escape}");

      expect(document.activeElement).toBe(article);
      expect(document.activeElement).not.toBe(document.body);
      const announcer = document.querySelector('[aria-live="polite"]');
      expect(announcer?.textContent).toContain(
        "Press Tab to return to the host page"
      );
    });

    it("visibility: widget container and buttons define a :focus-visible ring", () => {
      const cssPath = path.resolve(
        process.cwd(),
        "src/components/embed/EmbedWidgetLayouts.css"
      );
      const embedWidgetCss = fs.readFileSync(cssPath, "utf8");
      expect(embedWidgetCss).toContain(":focus-visible");
      expect(embedWidgetCss).toContain("var(--interactive-focus-ring, #007acc)");
      expect(embedWidgetCss).toMatch(/\.embed-widget-card:focus-visible/);
      expect(embedWidgetCss).toMatch(/\.embed-widget-banner:focus-visible/);
      expect(embedWidgetCss).toMatch(/\.embed-widget-compact:focus-visible/);
      expect(embedWidgetCss).toMatch(/button:focus-visible/);
    });
  });
});
