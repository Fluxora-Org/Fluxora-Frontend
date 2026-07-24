import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreateStreamModal from "../CreateStreamModal";
import { createStream, getTransactionStatus } from "../../lib/stellar/tx";

vi.mock("../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    address: "GDBWW22BDP5HN3ZTG7LLID665PA72DGOLOONLUM5TKQFRAQA3EYGKIRC",
    network: "TESTNET",
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("../../lib/stellar/tx", () => ({
  createStream: vi.fn(),
  getTransactionStatus: vi.fn(),
}));

const VALID_STELLAR =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

function renderModal() {
  return render(<CreateStreamModal isOpen={true} onClose={() => {}} />);
}

function fillStep1(container: HTMLElement) {
  fireEvent.change(
    container.querySelector("#create-stream-recipient") as HTMLInputElement,
    { target: { value: VALID_STELLAR } },
  );
  fireEvent.change(
    container.querySelector("#create-stream-deposit") as HTMLInputElement,
    { target: { value: "100" } },
  );
}

function goNext(container: HTMLElement) {
  fireEvent.click(within(container).getByRole("button", { name: /^next$/i }));
}

describe("CreateStreamModal progress stepper", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an ordered list with aria-current='step' on step 1 initially", () => {
    const { container } = renderModal();

    const nav = screen.getByRole("navigation", { name: /create stream steps/i });
    const list = within(nav).getByRole("list");
    expect(list.tagName).toBe("OL");

    const current = container.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(current?.textContent).toContain("1");
  });

  it("marks step 1 completed (clickable) and step 2 current after advancing", () => {
    const { container } = renderModal();
    fillStep1(container);
    goNext(container);

    const current = container.querySelector('[aria-current="step"]');
    expect(current?.textContent).toContain("2");

    // Step 1 is now a real, labeled button — keyboard-focusable by default.
    const step1Button = screen.getByRole("button", {
      name: /go back to step 1/i,
    });
    expect(step1Button.tagName).toBe("BUTTON");
  });

  it("does not expose upcoming steps as buttons or focusable elements", () => {
    const { container } = renderModal();

    // On step 1, steps 2 and 3 are upcoming.
    expect(
      screen.queryByRole("button", { name: /go back to step 2/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /go back to step 3/i }),
    ).toBeNull();

    const upcomingItems = container.querySelectorAll(".stepper-item--upcoming");
    expect(upcomingItems.length).toBe(2);
    upcomingItems.forEach((item) => {
      expect(item.querySelector("button")).toBeNull();
      expect(item.querySelector("[tabindex]")).toBeNull();
    });
  });

  it("jumps back to step 1 when its stepper button is clicked from step 2", () => {
    const { container } = renderModal();
    fillStep1(container);
    goNext(container);

    expect(container.querySelector("#create-stream-recipient")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /go back to step 1/i }));

    expect(container.querySelector("#create-stream-recipient")).not.toBeNull();
    expect(container.querySelector('[aria-current="step"]')?.textContent).toContain("1");
  });

  it("disables the completed-step buttons while a submission is actively in flight", async () => {
    let resolveCreate: (value: any) => void = () => {};
    vi.mocked(createStream).mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    vi.mocked(getTransactionStatus).mockResolvedValue("confirmed");

    const { container } = renderModal();
    fillStep1(container);
    goNext(container);
    goNext(container); // step 2 -> step 3

    fireEvent.click(
      within(container).getByRole("button", { name: /^create stream$/i }),
    );

    const step1Button = screen.getByRole("button", { name: /go back to step 1/i });
    expect(step1Button).toBeDisabled();

    await act(async () => {
      resolveCreate({ status: "SUCCESS", txHash: "abc123" });
      await Promise.resolve();
    });
  });

  it("renders the compact 'Step X of 3' status text for the current step", () => {
    const { container } = renderModal();
    fillStep1(container);
    goNext(container);

    const compactText = container.querySelector(".stepper-compact-text");
    expect(compactText?.textContent).toMatch(/step 2 of 3/i);
  });
});
