import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StreamCreatedModal from "../StreamCreatedModal";
import { defaultStreamCreatedModalProps } from "./testUtils";
import {
  SHARE_WORKSPACES_KEY,
  connectWorkspace,
  disconnectWorkspace,
} from "../../../lib/shareWorkspaces";
import { useOptionalToast } from "../../toast/ToastProvider";

const { mockCss } = vi.hoisted(() => ({
  mockCss: {
    default: new Proxy(
      {},
      {
        get: (_target, prop) =>
          typeof prop === "string" ? prop : undefined,
      },
    ),
  },
}));

vi.mock("../StreamCreatedModal.module.css", () => mockCss);

describe("StreamCreatedModal Slack/Teams share flow", () => {
  const defaultProps = { ...defaultStreamCreatedModalProps };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem(SHARE_WORKSPACES_KEY);
    disconnectWorkspace("slack");
    disconnectWorkspace("teams");
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.removeItem(SHARE_WORKSPACES_KEY);
  });

  it("shows connect CTA when Slack is not connected", () => {
    render(<StreamCreatedModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /share to slack/i }));

    expect(
      screen.getByRole("button", { name: /connect slack/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /channel/i }),
    ).not.toBeInTheDocument();
  });

  it("connects Slack and reveals a labeled channel combobox with preview fields", async () => {
    vi.useFakeTimers();
    render(<StreamCreatedModal {...defaultProps} cliff="30 days" />);

    fireEvent.click(screen.getByRole("button", { name: /share to slack/i }));
    fireEvent.click(screen.getByRole("button", { name: /connect slack/i }));

    expect(screen.getByText(/connecting to slack/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(
      screen.getByRole("combobox", { name: /channel/i }),
    ).toBeInTheDocument();
    const preview = screen.getByRole("heading", {
      name: /message preview/i,
    }).closest("article");
    expect(preview).not.toBeNull();
    expect(preview).toHaveTextContent("GCD...RECIPIENT");
    expect(preview).toHaveTextContent("0.0261 USDC/sec");
    expect(preview).toHaveTextContent("30 days");
    expect(screen.getByText(/connected to fluxora hq/i)).toBeInTheDocument();
  });

  it("filters channels via the combobox and sends a success toast", async () => {
    vi.useFakeTimers();
    connectWorkspace("slack");
    const toast = useOptionalToast();

    render(<StreamCreatedModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /share to slack/i }));

    const combobox = screen.getByRole("combobox", { name: /channel/i });
    fireEvent.focus(combobox);
    fireEvent.change(combobox, { target: { value: "pay" } });

    expect(screen.getByRole("option", { name: /#payroll/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /#general/i }),
    ).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("option", { name: /#payroll/i }));

    fireEvent.click(screen.getByRole("button", { name: /send to channel/i }));

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByRole("button", { name: /^sent$/i })).toBeInTheDocument();
    expect(toast?.addToast).toHaveBeenCalledWith(
      "Stream summary shared to payroll on Slack.",
      "success",
    );
  });

  it("surfaces send-failed feedback with an error toast", async () => {
    vi.useFakeTimers();
    connectWorkspace("teams");
    const toast = useOptionalToast();

    render(
      <StreamCreatedModal {...defaultProps} forceShareFailure />,
    );

    fireEvent.click(screen.getByRole("button", { name: /share to teams/i }));

    const combobox = screen.getByRole("combobox", { name: /channel/i });
    fireEvent.focus(combobox);
    fireEvent.mouseDown(screen.getByRole("option", { name: /#general/i }));

    fireEvent.click(screen.getByRole("button", { name: /send to channel/i }));

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/could not post/i);
    expect(screen.getByRole("button", { name: /retry send/i })).toBeInTheDocument();
    expect(toast?.addToast).toHaveBeenCalledWith(
      "Could not share to Microsoft Teams. Try again.",
      "error",
    );
  });

  it("supports keyboard filtering and selection in the channel combobox", async () => {
    connectWorkspace("slack");
    render(<StreamCreatedModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /share to slack/i }));

    const combobox = screen.getByRole("combobox", { name: /channel/i });
    fireEvent.focus(combobox);
    fireEvent.change(combobox, { target: { value: "eng" } });
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "Enter" });

    expect(combobox).toHaveValue("engineering");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /send to channel/i }),
      ).not.toBeDisabled();
    });
  });
});
