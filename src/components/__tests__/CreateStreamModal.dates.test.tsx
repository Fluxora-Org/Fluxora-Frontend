import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import CreateStreamModal from "../CreateStreamModal";

// Checksum-valid Stellar public key (required by the centralized
// isValidStellarAddress validator introduced in #331).
const VALID_STELLAR =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

function renderStep2() {
  const view = render(<CreateStreamModal isOpen={true} onClose={() => {}} />);

  fireEvent.change(
    view.container.querySelector("#create-stream-recipient") as HTMLInputElement,
    { target: { value: VALID_STELLAR } },
  );
  fireEvent.change(
    view.container.querySelector("#create-stream-deposit") as HTMLInputElement,
    { target: { value: "100" } },
  );
  fireEvent.click(within(view.container).getByRole("button", { name: /^next$/i }));

  return view;
}

function goToReview(container: HTMLElement) {
  fireEvent.click(within(container).getByRole("button", { name: /^next$/i }));
}

describe("CreateStreamModal date consistency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses datetime-local for custom start and cliff inputs", () => {
    const { container } = renderStep2();

    fireEvent.click(screen.getByRole("button", { name: /custom date/i }));
    fireEvent.click(screen.getByText(/enable cliff/i));

    expect(
      container.querySelector("#create-stream-custom-start-date"),
    ).toHaveAttribute("type", "datetime-local");
    expect(container.querySelector("#create-stream-cliff-date")).toHaveAttribute(
      "type",
      "datetime-local",
    );
  });

  it("rejects a custom start datetime in the past", () => {
    const { container } = renderStep2();

    fireEvent.click(screen.getByRole("button", { name: /custom date/i }));
    fireEvent.change(
      container.querySelector("#create-stream-custom-start-date") as HTMLInputElement,
      { target: { value: "2026-06-20T11:59" } },
    );
    goToReview(container);

    expect(screen.getByText("Start date must be in the future.")).toBeInTheDocument();
  });

  it("rejects a cliff datetime before the custom start datetime", () => {
    const { container } = renderStep2();

    fireEvent.click(screen.getByRole("button", { name: /custom date/i }));
    fireEvent.change(
      container.querySelector("#create-stream-custom-start-date") as HTMLInputElement,
      { target: { value: "2026-06-20T14:00" } },
    );
    fireEvent.click(screen.getByText(/enable cliff/i));
    fireEvent.change(
      container.querySelector("#create-stream-cliff-date") as HTMLInputElement,
      { target: { value: "2026-06-20T13:00" } },
    );
    goToReview(container);

    expect(
      screen.getByText("Cliff date must be on or after the start date."),
    ).toBeInTheDocument();
  });
});
