import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RecipientAddressPicker from "../RecipientAddressPicker";
import { addAddressBookEntry } from "../../lib/addressBook";
import { ACCOUNT_BROWSER_STORAGE_CLEARED_EVENT } from "../../lib/browserStorage";

const ADDRESS = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

function PickerHarness() {
  const [value, setValue] = useState("");
  return (
    <RecipientAddressPicker
      id="recipient-address"
      value={value}
      onRecipientChange={setValue}
    />
  );
}

beforeEach(() => {
  localStorage.clear();
  window.dispatchEvent(new Event(ACCOUNT_BROWSER_STORAGE_CLEARED_EVENT));
});

afterEach(() => {
  localStorage.clear();
  window.dispatchEvent(new Event(ACCOUNT_BROWSER_STORAGE_CLEARED_EVENT));
});

describe("RecipientAddressPicker", () => {
  it("adds, renames, and deletes a labeled recipient without rendering label markup", () => {
    render(<PickerHarness />);
    const input = screen.getByRole("combobox", { name: "" });
    fireEvent.change(input, { target: { value: ADDRESS } });
    fireEvent.click(
      screen.getByRole("button", { name: /save this recipient with a label/i }),
    );

    fireEvent.change(screen.getByLabelText(/label for this address/i), {
      target: { value: "<img src=x>" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save recipient/i }));

    expect(screen.getAllByText("<img src=x>").length).toBeGreaterThan(0);
    expect(document.querySelector("img")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /rename <img src=x>/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /rename <img src=x>/i }), {
      target: { value: "Operations" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save label/i }));
    expect(screen.getAllByText("Operations").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /delete operations/i }));
    expect(screen.queryAllByText("Operations")).toHaveLength(0);
  });

  it("selects saved recipients with the keyboard and ignores selection keys during IME composition", () => {
    addAddressBookEntry(ADDRESS, "Payroll");
    render(<PickerHarness />);
    const input = screen.getByRole("combobox", { name: "" });

    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "ArrowDown", isComposing: true });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(input).toHaveValue("");

    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue(ADDRESS);
    expect(within(screen.getByRole("listbox", { hidden: true })).queryAllByRole("option"))
      .toHaveLength(0);
  });
});
