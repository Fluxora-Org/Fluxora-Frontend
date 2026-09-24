import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
});
