import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import Recipient from "../Recipient";
import { WalletProvider } from "../../components/wallet-connect/Walletcontext";
import { ToastProvider } from "../../components/toast/ToastProvider";

vi.mock("../../lib/stellar/tx", () => ({ withdraw: vi.fn() }));
vi.mock("../../components/treasuryOverviewPage/useTreasury", () => ({
  useRecipientStreams: () => ({ streams: [], loading: false, error: null, refetch: vi.fn() }),
}));

function renderRecipient() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <WalletProvider>
          <ToastProvider>
            <Recipient />
          </ToastProvider>
        </WalletProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Recipient biometric security gate", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("PublicKeyCredential", undefined);
  });

  it("renders the security gate settings card when wallet is connected", () => {
    renderRecipient();
    const gateSection = screen.queryByText("Local Security Gate");
    expect(gateSection).toBeTruthy();
  });

  it("shows 'Disabled' status badge by default", () => {
    renderRecipient();
    const badge = screen.queryByText("Disabled");
    expect(badge).toBeTruthy();
  });

  it("shows 'Enable' button when gate is disabled", () => {
    renderRecipient();
    const enableBtn = screen.queryByText("Enable");
    expect(enableBtn).toBeTruthy();
  });
});