import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SessionRecoveryBanner from "../SessionRecoveryBanner";

const NOW = 1_700_000_000_000;
const ONE_MINUTE = 60_000;

function noop() {}

describe("SessionRecoveryBanner", () => {
  describe("detected state", () => {
    it("announces via a status role and shows the Restore / Start fresh choice", () => {
      render(
        <SessionRecoveryBanner
          state="detected"
          savedAt={NOW - 12 * ONE_MINUTE}
          now={NOW}
          hasDraft={false}
          onRestore={noop}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );

      expect(
        screen.getByRole("status", { name: /we restored your previous session/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Restore" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Start fresh" }),
      ).toBeInTheDocument();
    });

    it("mentions the elapsed time since the snapshot was saved", () => {
      render(
        <SessionRecoveryBanner
          state="detected"
          savedAt={NOW - 12 * ONE_MINUTE}
          now={NOW}
          hasDraft={false}
          onRestore={noop}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );

      expect(screen.getByText(/~12 minutes ago/i)).toBeInTheDocument();
    });

    it("only mentions the unsaved draft when hasDraft is true", () => {
      const { rerender } = render(
        <SessionRecoveryBanner
          state="detected"
          savedAt={NOW}
          now={NOW}
          hasDraft={false}
          onRestore={noop}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );
      expect(screen.queryByText(/unsaved stream draft/i)).not.toBeInTheDocument();

      rerender(
        <SessionRecoveryBanner
          state="detected"
          savedAt={NOW}
          now={NOW}
          hasDraft={true}
          onRestore={noop}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );
      expect(screen.getByText(/unsaved stream draft/i)).toBeInTheDocument();
    });

    it("calls onRestore when Restore is clicked", async () => {
      const user = userEvent.setup();
      const onRestore = vi.fn();
      render(
        <SessionRecoveryBanner
          state="detected"
          savedAt={NOW}
          now={NOW}
          hasDraft={false}
          onRestore={onRestore}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Restore" }));
      expect(onRestore).toHaveBeenCalledTimes(1);
    });

    it("calls onStartFresh when Start fresh is clicked", async () => {
      const user = userEvent.setup();
      const onStartFresh = vi.fn();
      render(
        <SessionRecoveryBanner
          state="detected"
          savedAt={NOW}
          now={NOW}
          hasDraft={false}
          onRestore={noop}
          onStartFresh={onStartFresh}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Start fresh" }));
      expect(onStartFresh).toHaveBeenCalledTimes(1);
    });

    it("is keyboard operable — Restore is reachable via Tab and activatable via Enter", async () => {
      const user = userEvent.setup();
      const onRestore = vi.fn();
      render(
        <SessionRecoveryBanner
          state="detected"
          savedAt={NOW}
          now={NOW}
          hasDraft={false}
          onRestore={onRestore}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );

      const restoreButton = screen.getByRole("button", { name: "Restore" });
      restoreButton.focus();
      expect(restoreButton).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(onRestore).toHaveBeenCalledTimes(1);
    });

    it("has real, non-icon-only button elements with visible tabIndex for the heading only (not the actions)", () => {
      render(
        <SessionRecoveryBanner
          state="detected"
          savedAt={NOW}
          now={NOW}
          hasDraft={false}
          onRestore={noop}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );

      expect(screen.getByRole("button", { name: "Restore" }).tagName).toBe("BUTTON");
      expect(screen.getByRole("button", { name: "Start fresh" }).tagName).toBe("BUTTON");
    });

    it("calls onDismiss when the dismiss (x) button is clicked, without restoring or clearing", async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const onRestore = vi.fn();
      const onStartFresh = vi.fn();
      render(
        <SessionRecoveryBanner
          state="detected"
          savedAt={NOW}
          now={NOW}
          hasDraft={false}
          onRestore={onRestore}
          onStartFresh={onStartFresh}
          onResumeDraft={noop}
          onDismiss={onDismiss}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onRestore).not.toHaveBeenCalled();
      expect(onStartFresh).not.toHaveBeenCalled();
    });
  });

  describe("restored state", () => {
    it("shows a restored confirmation and, when a draft exists, a Resume draft action", () => {
      render(
        <SessionRecoveryBanner
          state="restored"
          savedAt={NOW}
          now={NOW}
          hasDraft={true}
          onRestore={noop}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );

      expect(screen.getByText(/session restored/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /resume draft stream/i }),
      ).toBeInTheDocument();
    });

    it("omits the Resume draft action when there is no draft", () => {
      render(
        <SessionRecoveryBanner
          state="restored"
          savedAt={NOW}
          now={NOW}
          hasDraft={false}
          onRestore={noop}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );

      expect(
        screen.queryByRole("button", { name: /resume draft stream/i }),
      ).not.toBeInTheDocument();
    });

    it("calls onResumeDraft when clicked", async () => {
      const user = userEvent.setup();
      const onResumeDraft = vi.fn();
      render(
        <SessionRecoveryBanner
          state="restored"
          savedAt={NOW}
          now={NOW}
          hasDraft={true}
          onRestore={noop}
          onStartFresh={noop}
          onResumeDraft={onResumeDraft}
          onDismiss={noop}
        />,
      );

      await user.click(screen.getByRole("button", { name: /resume draft stream/i }));
      expect(onResumeDraft).toHaveBeenCalledTimes(1);
    });
  });

  describe("start-fresh state", () => {
    it("shows the start-fresh confirmation copy", () => {
      render(
        <SessionRecoveryBanner
          state="start-fresh"
          savedAt={NOW}
          now={NOW}
          hasDraft={false}
          onRestore={noop}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );

      expect(
        screen.getByText(/starting fresh.*previous filters and draft were cleared/i),
      ).toBeInTheDocument();
    });
  });

  describe("focus management", () => {
    it("moves focus to the heading when the state changes", () => {
      const { rerender } = render(
        <SessionRecoveryBanner
          state="detected"
          savedAt={NOW}
          now={NOW}
          hasDraft={false}
          onRestore={noop}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );

      expect(screen.getByText(/we restored your previous session/i)).toHaveFocus();

      rerender(
        <SessionRecoveryBanner
          state="restored"
          savedAt={NOW}
          now={NOW}
          hasDraft={false}
          onRestore={noop}
          onStartFresh={noop}
          onResumeDraft={noop}
          onDismiss={noop}
        />,
      );

      expect(screen.getByText(/session restored/i)).toHaveFocus();
    });
  });
});
