import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CreateStreamModal from "../CreateStreamModal";
import { selectSingleStreamInContainer } from "./CreateStreamModal.testUtils";

// This regression exercises the single-stream fields, not the CSV preview.
vi.mock("../csv-upload/PreviewValidateStep", () => ({ default: () => null }));

const RECIPIENT = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

describe("CreateStreamModal field descriptions", () => {
  it.each([
    ["create-stream-accrual-rate", "10"],
    ["create-stream-duration", "2"],
  ])(
    "associates %s with its error and restores the hint after correction",
    (id, validValue) => {
      const { container } = render(
        <CreateStreamModal isOpen onClose={vi.fn()} />,
      );
      selectSingleStreamInContainer(container);
      const dialog = screen.getByRole("dialog", { name: /create stream/i });
      fireEvent.change(within(dialog).getByLabelText(/recipient/i), {
        target: { value: RECIPIENT },
      });
      fireEvent.change(within(dialog).getByLabelText(/deposit amount/i), {
        target: { value: "100" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: /^next$/i }));

      const input = document.getElementById(id)!;
      const hint = document.getElementById(`${id}-hint`)!;
      expect(hint).toBeInTheDocument();
      expect(input).toHaveAccessibleDescription(
        expect.stringContaining(hint.textContent!),
      );

      fireEvent.change(input, { target: { value: "" } });
      fireEvent.blur(input);
      const error = document.getElementById(`${id}-error`)!;
      expect(error).toHaveAttribute("role", "alert");
      expect(input).toHaveAccessibleDescription(
        expect.stringContaining(error.textContent!),
      );
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(document.getElementById(`${id}-hint`)).not.toBeInTheDocument();

      fireEvent.change(input, { target: { value: validValue } });
      fireEvent.blur(input);
      expect(error).not.toBeInTheDocument();
      expect(input).not.toHaveAttribute("aria-invalid");
      expect(
        input.getAttribute("aria-describedby")?.split(/\s+/),
      ).not.toContain(`${id}-error`);
      const restoredHint = document.getElementById(`${id}-hint`)!;
      expect(input).toHaveAccessibleDescription(
        expect.stringContaining(restoredHint.textContent!),
      );
      expect(input.getAttribute("aria-describedby")?.split(/\s+/)).toContain(
        `${id}-unit`,
      );
      expect(input.getAttribute("aria-describedby")?.split(/\s+/)).toContain(
        `${id}-keyboard-hint`,
      );
    },
  );
});
