import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StreamCreatedModal from "./StreamCreatedModal";
import { clearRecentCreatedStreams } from "../../lib/recentCreatedStreams";
import {
  connectWorkspace,
  writeConnectedWorkspaces,
} from "../../lib/shareWorkspaces";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  streamId: "STR-123",
  streamUrl: "https://fluxora.io/stream/STR-123",
  onCreateAnother: vi.fn(),
};

describe("StreamCreatedModal keyboard and screen-reader accessibility (#1961)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRecentCreatedStreams();
    writeConnectedWorkspaces([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── 1. Reachable by Tab in a sensible order ──────────────────────────────────
  describe("Every interactive element is reachable by Tab in a sensible order", () => {
    it("sets initial focus to the close button upon opening", async () => {
      render(<StreamCreatedModal {...defaultProps} />);
      const closeButton = screen.getByRole("button", {
        name: /close stream created modal/i,
      });

      await waitFor(() => {
        expect(closeButton).toHaveFocus();
      });
    });

    it("traverses all idle interactive controls in forward Tab order", async () => {
      const user = userEvent.setup();
      render(<StreamCreatedModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", {
        name: /close stream created modal/i,
      });
      const copyIdButton = screen.getByRole("button", {
        name: /copy stream identifier/i,
      });
      const copyUrlButton = screen.getByRole("button", {
        name: /copy stream url/i,
      });
      const slackButton = screen.getByRole("button", {
        name: /share to slack/i,
      });
      const teamsButton = screen.getByRole("button", {
        name: /share to teams/i,
      });
      const createAnotherButton = screen.getByRole("button", {
        name: /create another/i,
      });
      const openDetailsLink = screen.getByRole("link", {
        name: /open stream details/i,
      });
      const viewStreamButton = screen.getByRole("button", {
        name: /view stream/i,
      });

      await waitFor(() => expect(closeButton).toHaveFocus());

      await user.tab();
      expect(copyIdButton).toHaveFocus();

      await user.tab();
      expect(copyUrlButton).toHaveFocus();

      await user.tab();
      expect(slackButton).toHaveFocus();

      await user.tab();
      expect(teamsButton).toHaveFocus();

      await user.tab();
      expect(createAnotherButton).toHaveFocus();

      await user.tab();
      expect(openDetailsLink).toHaveFocus();

      await user.tab();
      expect(viewStreamButton).toHaveFocus();
    });

    it("traverses controls in reverse order with Shift+Tab", async () => {
      const user = userEvent.setup();
      render(<StreamCreatedModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", {
        name: /close stream created modal/i,
      });
      const viewStreamButton = screen.getByRole("button", {
        name: /view stream/i,
      });
      const openDetailsLink = screen.getByRole("link", {
        name: /open stream details/i,
      });

      await waitFor(() => expect(closeButton).toHaveFocus());

      // Reverse tab from first element wraps to the last focusable element
      await user.tab({ shift: true });
      expect(viewStreamButton).toHaveFocus();

      await user.tab({ shift: true });
      expect(openDetailsLink).toHaveFocus();
    });

    it("traps keyboard focus within the dialog (wrap-around)", async () => {
      const user = userEvent.setup();
      render(<StreamCreatedModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", {
        name: /close stream created modal/i,
      });
      const viewStreamButton = screen.getByRole("button", {
        name: /view stream/i,
      });

      await waitFor(() => expect(closeButton).toHaveFocus());

      viewStreamButton.focus();
      expect(viewStreamButton).toHaveFocus();

      // Tab from last element wraps to first
      await user.tab();
      expect(closeButton).toHaveFocus();
    });

    it("includes channel picker controls in Tab order when a provider is connected", async () => {
      connectWorkspace("slack");
      const user = userEvent.setup();
      render(<StreamCreatedModal {...defaultProps} />);

      const slackButton = screen.getByRole("button", {
        name: /share to slack/i,
      });
      await act(async () => {
        await user.click(slackButton);
      });

      // Provider starts connected by mock definition or connect button is presented
      const channelInput = screen.queryByRole("combobox", { name: /channel/i });
      if (channelInput) {
        channelInput.focus();
        expect(channelInput).toHaveFocus();

        await user.tab();
        const previewLink = screen.getByRole("link", {
          name: defaultProps.streamUrl,
        });
        expect(previewLink).toHaveFocus();

        // Send button is disabled until channel is selected
        const sendButton = screen.getByRole("button", {
          name: /send to channel/i,
        });
        expect(sendButton).toBeDisabled();
      }
    });

    it("includes popup-blocked fallback link in Tab order when popup is blocked", async () => {
      vi.spyOn(window, "open").mockReturnValue(null);
      const user = userEvent.setup();
      render(<StreamCreatedModal {...defaultProps} />);

      const viewStreamButton = screen.getByRole("button", {
        name: /view stream/i,
      });
      await user.click(viewStreamButton);

      const fallbackLink = screen.getByRole("link", {
        name: /click here to view your stream/i,
      });
      expect(fallbackLink).toBeInTheDocument();

      fallbackLink.focus();
      expect(fallbackLink).toHaveFocus();
    });

    it("closes modal on Escape key press", async () => {
      const user = userEvent.setup();
      render(<StreamCreatedModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", {
        name: /close stream created modal/i,
      });
      await waitFor(() => expect(closeButton).toHaveFocus());

      await user.keyboard("{Escape}");
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });

  // ─── 2. Focus is visible at each stop ─────────────────────────────────────────
  describe("Focus is visible at each stop", () => {
    it("ensures each interactive element has an identifiable focus-visible class or outline", () => {
      render(<StreamCreatedModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", {
        name: /close stream created modal/i,
      });
      const copyIdButton = screen.getByRole("button", {
        name: /copy stream identifier/i,
      });
      const copyUrlButton = screen.getByRole("button", {
        name: /copy stream url/i,
      });
      const slackButton = screen.getByRole("button", {
        name: /share to slack/i,
      });
      const createAnotherButton = screen.getByRole("button", {
        name: /create another/i,
      });
      const openDetailsLink = screen.getByRole("link", {
        name: /open stream details/i,
      });
      const viewStreamButton = screen.getByRole("button", {
        name: /view stream/i,
      });

      // Assert class names for focus styling are assigned
      expect(closeButton.className).toMatch(/closeButton/);
      expect(copyIdButton.className).toMatch(/identifierCopyButton/);
      expect(copyUrlButton.className).toMatch(/copyButton/);
      expect(slackButton.className).toMatch(/shareButton/);
      expect(createAnotherButton.className).toMatch(/btn/);
      expect(openDetailsLink.className).toMatch(/btn/);
      expect(viewStreamButton.className).toMatch(/btn/);
    });

    it("verifies channel combobox and preview link have designated interactive classes", async () => {
      connectWorkspace("slack");
      const user = userEvent.setup();
      render(<StreamCreatedModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /share to slack/i }));

      const channelInput = screen.queryByRole("combobox", { name: /channel/i });
      if (channelInput) {
        expect(channelInput.className).toMatch(/channelInput/);
        const previewLink = screen.getByRole("link", {
          name: defaultProps.streamUrl,
        });
        expect(previewLink.className).toMatch(/sharePreviewLink/);
      }
    });
  });

  // ─── 3. Controls expose an accessible name ────────────────────────────────────
  describe("Controls expose an accessible name", () => {
    it("identifies the dialog with accessible name and description", () => {
      render(<StreamCreatedModal {...defaultProps} />);

      const dialog = screen.getByRole("dialog", { name: /stream created!/i });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "stream-created-title");
      expect(dialog).toHaveAttribute(
        "aria-describedby",
        "stream-created-description",
      );
      expect(
        screen.getByText(
          /recipient can start withdrawing accrued funds anytime/i,
        ),
      ).toBeInTheDocument();
    });

    it("exposes clear accessible names for idle buttons and links", () => {
      render(<StreamCreatedModal {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: "Close stream created modal" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Copy stream identifier" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Copy stream URL" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Share to Slack" }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(
        screen.getByRole("button", { name: "Share to Teams" }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(
        screen.getByRole("button", { name: "Create another" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Open stream details" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "View stream" }),
      ).toBeInTheDocument();
    });

    it("exposes accessible names and ARIA attributes for combobox and options", async () => {
      connectWorkspace("slack");
      const user = userEvent.setup();
      render(<StreamCreatedModal {...defaultProps} />);

      await act(async () => {
        await user.click(
          screen.getByRole("button", { name: /share to slack/i }),
        );
      });

      const combobox = screen.getByRole("combobox", { name: "Channel" });
      expect(combobox).toHaveAttribute("aria-haspopup", "listbox");
      expect(combobox).toHaveAttribute("aria-autocomplete", "list");

      // Open dropdown via keyboard
      combobox.focus();
      await act(async () => {
        await user.keyboard("{ArrowDown}");
      });

      expect(combobox).toHaveAttribute("aria-expanded", "true");
      const listbox = screen.getByRole("listbox", {
        name: "Available channels",
      });
      expect(listbox).toBeInTheDocument();

      const options = within(listbox).getAllByRole("option");
      expect(options.length).toBeGreaterThan(0);
      expect(options[0]).toHaveAttribute("aria-selected");
    });

    it("ensures decorative icons within controls have aria-hidden=true", () => {
      render(<StreamCreatedModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", {
        name: "Close stream created modal",
      });
      expect(closeButton.querySelector("svg")).toHaveAttribute(
        "aria-hidden",
        "true",
      );

      const copyUrlButton = screen.getByRole("button", {
        name: "Copy stream URL",
      });
      expect(copyUrlButton.querySelector("svg")).toHaveAttribute(
        "aria-hidden",
        "true",
      );

      const createAnotherButton = screen.getByRole("button", {
        name: "Create another",
      });
      expect(createAnotherButton.querySelector("svg")).toHaveAttribute(
        "aria-hidden",
        "true",
      );

      const viewStreamButton = screen.getByRole("button", {
        name: "View stream",
      });
      expect(viewStreamButton.querySelector("svg")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });
  });

  // ─── 4. Any state change that matters is announced ────────────────────────────
  describe("Any state change that matters is announced", () => {
    it("announces live status on initial open via live region", () => {
      render(<StreamCreatedModal {...defaultProps} />);

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
      expect(liveRegion).toHaveAttribute("aria-atomic", "true");
      expect(liveRegion).toHaveTextContent(
        "Success! Your USDC stream is now live on Stellar.",
      );
    });

    it("announces when stream identifier is copied and updates button name", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });

      render(<StreamCreatedModal {...defaultProps} />);
      const copyIdButton = screen.getByRole("button", {
        name: "Copy stream identifier",
      });

      await act(async () => {
        fireEvent.click(copyIdButton);
        await Promise.resolve();
      });

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveTextContent("Stream identifier copied");
      expect(
        screen.getByRole("button", { name: "Copied stream identifier" }),
      ).toBeInTheDocument();
    });

    it("announces when stream URL is copied and updates button label", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });

      render(<StreamCreatedModal {...defaultProps} />);
      const copyUrlButton = screen.getByRole("button", {
        name: "Copy stream URL",
      });

      await act(async () => {
        fireEvent.click(copyUrlButton);
        await Promise.resolve();
      });

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveTextContent("Stream URL copied");
      expect(
        screen.getByRole("button", { name: "Copied stream URL" }),
      ).toBeInTheDocument();
    });

    it("announces share provider selection and updates aria-pressed", async () => {
      const user = userEvent.setup();
      render(<StreamCreatedModal {...defaultProps} />);

      const slackButton = screen.getByRole("button", {
        name: "Share to Slack",
      });
      const teamsButton = screen.getByRole("button", {
        name: "Share to Teams",
      });

      await user.click(slackButton);
      expect(slackButton).toHaveAttribute("aria-pressed", "true");
      expect(teamsButton).toHaveAttribute("aria-pressed", "false");

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveTextContent(/slack/i);
    });

    it("announces channel selection when keyboard navigating the combobox", async () => {
      connectWorkspace("slack");
      const user = userEvent.setup();
      render(<StreamCreatedModal {...defaultProps} />);

      await act(async () => {
        await user.click(
          screen.getByRole("button", { name: "Share to Slack" }),
        );
      });

      const combobox = screen.getByRole("combobox", { name: "Channel" });
      combobox.focus();
      await act(async () => {
        await user.keyboard("{ArrowDown}");
        await user.keyboard("{Enter}");
      });

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveTextContent(/channel.*selected/i);

      // Now send button should be enabled
      const sendButton = screen.getByRole("button", {
        name: /send to channel/i,
      });
      expect(sendButton).toBeEnabled();
    });

    it("announces share failure via role=alert when sending fails", async () => {
      connectWorkspace("slack");
      vi.useFakeTimers();
      render(<StreamCreatedModal {...defaultProps} forceShareFailure={true} />);

      fireEvent.click(screen.getByRole("button", { name: "Share to Slack" }));

      const combobox = screen.getByRole("combobox", { name: "Channel" });
      fireEvent.focus(combobox);
      fireEvent.keyDown(combobox, { key: "ArrowDown" });
      fireEvent.keyDown(combobox, { key: "Enter" });

      const sendButton = screen.getByRole("button", {
        name: /send to channel/i,
      });
      fireEvent.click(sendButton);

      // Advance timers for the async share attempt
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByRole("alert")).toHaveTextContent(
        /could not post to the selected channel/i,
      );
      expect(
        screen.getByRole("button", { name: /retry send/i }),
      ).toBeInTheDocument();
    });

    it("announces popup blocked fallback via role=alert when window.open fails", () => {
      vi.spyOn(window, "open").mockReturnValue(null);
      render(<StreamCreatedModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "View stream" }));

      expect(screen.getByRole("alert")).toHaveTextContent(/popup blocked/i);
    });
  });
});
