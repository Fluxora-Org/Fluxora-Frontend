import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateStreamModal from "../CreateStreamModal";

// Checksum-valid Stellar public key (required by the centralized
// isValidStellarAddress validator introduced in #331).
const VALID_STELLAR =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

function renderOpenModal(onClose = vi.fn()) {
  const result = render(
    <button type="button">Open create stream</button>,
  );
  const trigger = screen.getByRole("button", { name: /open create stream/i });
  trigger.focus();

  result.rerender(
    <>
      <button type="button">Open create stream</button>
      <CreateStreamModal isOpen onClose={onClose} />
    </>,
  );

  return { ...result, onClose, trigger };
}

async function flushAnimationFrame() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function fillValidStepOne(dialog: HTMLElement) {
  fireEvent.change(within(dialog).getByLabelText(/recipient/i), {
    target: { value: VALID_STELLAR },
  });
  fireEvent.change(within(dialog).getByLabelText(/deposit amount/i), {
    target: { value: "100" },
  });
}

describe("CreateStreamModal accessibility and keyboard behavior", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the open modal without axe violations", async () => {
    const { container } = renderOpenModal();
    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });

  it("focuses the recipient input, traps Tab, closes on Escape, and restores focus", async () => {
    const { onClose, rerender, trigger } = renderOpenModal();

    await flushAnimationFrame();
    const dialog = screen.getByRole("dialog", { name: /create stream/i });
    const recipient = within(dialog).getByLabelText(/recipient/i);
    const closeButton = within(dialog).getByRole("button", {
      name: /close create stream modal/i,
    });

    expect(recipient).toHaveFocus();

    trigger.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<button type="button">Open create stream</button>);
    await flushAnimationFrame();
    expect(trigger).toHaveFocus();
  });

  it("keeps Create stream unavailable until step-one and step-two inputs validate", async () => {
    const user = userEvent.setup();
    renderOpenModal();
    await flushAnimationFrame();

    const dialog = screen.getByRole("dialog", { name: /create stream/i });

    await user.click(within(dialog).getByRole("button", { name: /^next$/i }));
    expect(
      within(dialog).getByRole("heading", { name: /recipient & amount/i }),
    ).toBeInTheDocument();
    // The required-recipient message surfaces both in the form error banner and
    // the inline field validation, so assert at least one is present.
    expect(
      within(dialog).getAllByText(/recipient is required/i).length,
    ).toBeGreaterThan(0);

    fillValidStepOne(dialog);
    await user.click(within(dialog).getByRole("button", { name: /^next$/i }));
    expect(
      within(dialog).getByRole("heading", { name: /rate & schedule/i }),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /^next$/i }));
    expect(
      within(dialog).getByRole("button", { name: /^create stream$/i }),
    ).toBeEnabled();
  });
});
