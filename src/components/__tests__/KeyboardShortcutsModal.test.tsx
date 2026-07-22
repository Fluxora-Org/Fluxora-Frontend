import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { KeyboardShortcutsModal } from "../KeyboardShortcutsModal";

describe("KeyboardShortcutsModal", () => {
  it("opens when '?' is pressed and closes when 'Escape' is pressed", async () => {
    const user = userEvent.setup();
    render(<KeyboardShortcutsModal />);

    // Initially not open
    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();

    // Press '?'
    await user.keyboard("?");
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();

    // Press 'Escape'
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
  });

  it("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(<KeyboardShortcutsModal />);

    await user.keyboard("?");
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: /close keyboard shortcuts/i });
    await user.click(closeButton);

    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
  });

  it("closes when clicking the backdrop", async () => {
    const user = userEvent.setup();
    render(<KeyboardShortcutsModal />);

    await user.keyboard("?");
    const dialogContainer = screen.getByRole("dialog", { name: /keyboard shortcuts/i });
    expect(dialogContainer).toBeInTheDocument();

    // Click the dialog container itself (which is the backdrop)
    await user.click(dialogContainer);

    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
  });

  it("does not close when clicking inside the modal content", async () => {
    const user = userEvent.setup();
    render(<KeyboardShortcutsModal />);

    await user.keyboard("?");
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();

    // Click on the heading inside the modal
    const heading = screen.getByRole("heading", { name: "Keyboard Shortcuts" });
    await user.click(heading);

    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it("does not open when '?' is pressed inside an editable element", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <input type="text" aria-label="test input" />
        <textarea aria-label="test textarea" />
        <KeyboardShortcutsModal />
      </div>
    );

    const input = screen.getByRole("textbox", { name: "test input" });
    const textarea = screen.getByRole("textbox", { name: "test textarea" });

    // Focus input and press '?'
    await user.type(input, "?");
    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();

    // Focus textarea and press '?'
    await user.type(textarea, "?");
    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
  });

  it("does not open when '?' is pressed while another modal (aria-modal='true') is active", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div role="dialog" aria-modal="true" aria-label="Create Stream Modal">
          <button type="button">Action Button</button>
        </div>
        <KeyboardShortcutsModal />
      </div>
    );

    expect(screen.getByRole("dialog", { name: "Create Stream Modal" })).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Action Button" });
    button.focus();

    await user.keyboard("?");
    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
  });

  it("opens when '?' is pressed while a non-modal element (aria-modal='false') is present", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div role="dialog" aria-modal="false" aria-label="Tooltip">
          Tooltip content
        </div>
        <KeyboardShortcutsModal />
      </div>
    );

    await user.keyboard("?");
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it("closes KeyboardShortcutsModal when '?' is pressed while it is open and another modal is active", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<KeyboardShortcutsModal />);

    // Open KeyboardShortcutsModal
    await user.keyboard("?");
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();

    // Rerender with another active modal present
    rerender(
      <div>
        <div role="dialog" aria-modal="true" aria-label="Other Modal">
          Content
        </div>
        <KeyboardShortcutsModal />
      </div>
    );

    await user.keyboard("?");
    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
  });
});
