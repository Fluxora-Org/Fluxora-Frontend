import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WalletStatus from "../WalletStatus";
import {
  SHARE_WORKSPACES_KEY,
  connectWorkspace,
  disconnectWorkspace,
} from "../../../lib/shareWorkspaces";
import { useOptionalToast } from "../../toast/ToastProvider";

describe("WalletStatus share workspace indicator", () => {
  const mockAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem(SHARE_WORKSPACES_KEY);
    disconnectWorkspace("slack");
    disconnectWorkspace("teams");
  });

  it("shows Slack badge and disconnect action when connected", () => {
    connectWorkspace("slack", "Fluxora HQ");

    render(
      <WalletStatus
        address={mockAddress}
        network="TESTNET"
        onDisconnect={() => {}}
      />,
    );

    expect(screen.getByText(/slack · fluxora hq/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /wallet/i }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: /disconnect slack/i }),
    );

    const toast = useOptionalToast();
    expect(toast?.addToast).toHaveBeenCalledWith(
      "Slack workspace disconnected.",
      "info",
    );
    expect(screen.queryByText(/slack · fluxora hq/i)).not.toBeInTheDocument();
  });

  it("connects Teams from the wallet menu", () => {
    render(
      <WalletStatus
        address={mockAddress}
        network="TESTNET"
        onDisconnect={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /wallet/i }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: /connect microsoft teams/i }),
    );

    const toast = useOptionalToast();
    expect(toast?.addToast).toHaveBeenCalledWith(
      "Microsoft Teams workspace connected.",
      "success",
    );
    expect(screen.getByText(/teams · fluxora contoso/i)).toBeInTheDocument();
  });
});
