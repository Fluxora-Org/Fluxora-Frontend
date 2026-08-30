// Accessibility and interaction regression tests for KeyboardShortcutsModal
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeyboardShortcutsModal } from "../KeyboardShortcutsModal";

describe("KeyboardShortcutsModal accessibility interactions", () => {
  it("does not open when '?' is pressed with modifier keys", async () => {
    const user = userEvent.setup();
    render(<KeyboardShortcutsModal />);
    // Ctrl + ?
    await user.keyboard("{Control>}?{/Control}");
    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
    // Meta (Cmd) + ?
    await user.keyboard("{Meta>}?{/Meta}");
    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
  });

  it("does not toggle when IME composition is in progress", () => {
    render(<KeyboardShortcutsModal />);
    const compositionEvent = new KeyboardEvent("keydown", {
      key: "?",
      isComposing: true,
    });
    document.dispatchEvent(compositionEvent);
    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
  });

  it("escape closes modal even when focus is on an input", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <input type="text" aria-label="test input" />
        <KeyboardShortcutsModal />
      </div>
    );
    // Open modal
    await user.keyboard("?");
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
    // Focus input
    const input = screen.getByRole("textbox", { name: /test input/i });
    input.focus();
    // Press Escape
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
  });
});
