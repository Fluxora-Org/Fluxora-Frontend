import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AppNavbar from "../AppNavbar";

const VALID_STELLAR =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

vi.mock("../../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    connected: true,
    address: VALID_STELLAR,
    network: "TESTNET",
    expectedNetwork: "TESTNET",
    isNetworkMismatch: false,
    disconnect: vi.fn(),
  }),
}));

vi.mock("../../../theme/ThemeProvider", () => ({
  useTheme: () => ({
    theme: "light",
    toggleTheme: vi.fn(),
  }),
}));

describe("AppNavbar breadcrumbs", () => {
  it("preserves route labels and Stellar address masking on deep app routes", () => {
    render(
      <MemoryRouter initialEntries={[`/app/streams/${VALID_STELLAR}`]}>
        <AppNavbar />
      </MemoryRouter>,
    );

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Streams" })).toHaveAttribute(
      "href",
      "/app/streams",
    );

    const currentPage = within(breadcrumb).getByLabelText(VALID_STELLAR);
    expect(currentPage).toHaveTextContent(
      `${VALID_STELLAR.slice(0, 8)}...${VALID_STELLAR.slice(-4)}`,
    );
    expect(currentPage).toHaveAttribute("aria-current", "page");
    expect(currentPage).toHaveAttribute("title", VALID_STELLAR);
  });
});
