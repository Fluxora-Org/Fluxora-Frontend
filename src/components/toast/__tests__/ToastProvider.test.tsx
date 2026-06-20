vi.unmock("../ToastProvider");
import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "../ToastProvider";

// Helper: a button that adds a toast when clicked
function AddButton({
  message = "Hello",
  variant = "success" as const,
  timeout,
}: {
  message?: string;
  variant?: "success" | "error" | "info" | "warning";
  timeout?: number;
}) {
  const { addToast } = useToast();
  return (
    <button onClick={() => addToast(message, variant, timeout)}>
      Add {variant}
    </button>
  );
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("ToastProvider / useToast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders a toast when addToast is called", () => {
    renderWithProvider(<AddButton />);
    fireEvent.click(screen.getByRole("button", { name: /add success/i }));
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("auto-dismisses after the default timeout (4000ms)", () => {
    renderWithProvider(<AddButton />);
    fireEvent.click(screen.getByRole("button", { name: /add success/i }));
    expect(screen.getByText("Hello")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });

  it("respects a custom timeout", () => {
    renderWithProvider(<AddButton timeout={1000} />);
    fireEvent.click(screen.getByRole("button", { name: /add success/i }));

    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByText("Hello")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });

  it("dismisses on close button click", () => {
    renderWithProvider(<AddButton />);
    fireEvent.click(screen.getByRole("button", { name: /add success/i }));
    const dismiss = screen.getByRole("button", {
      name: /dismiss success notification/i,
    });
    act(() => fireEvent.click(dismiss));
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });

  it("stacks multiple toasts", () => {
    renderWithProvider(
      <>
        <AddButton message="First" />
        <AddButton message="Second" variant="error" />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /add success/i }));
    fireEvent.click(screen.getByRole("button", { name: /add error/i }));

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("dismissing one toast does not cancel others", () => {
    renderWithProvider(
      <>
        <AddButton message="A" timeout={2000} />
        <AddButton message="B" variant="error" timeout={6000} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /add success/i }));
    fireEvent.click(screen.getByRole("button", { name: /add error/i }));

    // Dismiss "A" manually
    const [dismissA] = screen.getAllByRole("button", {
      name: /dismiss .* notification/i,
    });
    act(() => fireEvent.click(dismissA!));

    expect(screen.queryByText("A")).not.toBeInTheDocument();
    // "B" must still be present
    expect(screen.getByText("B")).toBeInTheDocument();

    // "B" auto-dismisses after its own timer
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.queryByText("B")).not.toBeInTheDocument();
  });

  it("caps visible toasts at 3 and shows overflow count", () => {
    function ManyAdder() {
      const { addToast } = useToast();
      return (
        <button
          onClick={() => {
            addToast("T1", "success", 99999);
            addToast("T2", "info", 99999);
            addToast("T3", "warning", 99999);
            addToast("T4", "error", 99999);
          }}
        >
          Add 4
        </button>
      );
    }
    renderWithProvider(<ManyAdder />);
    fireEvent.click(screen.getByRole("button", { name: /add 4/i }));

    // Only the last 3 are shown (T2, T3, T4)
    expect(screen.getByText("T2")).toBeInTheDocument();
    expect(screen.getByText("T3")).toBeInTheDocument();
    expect(screen.getByText("T4")).toBeInTheDocument();
    expect(screen.queryByText("T1")).not.toBeInTheDocument();
    // Overflow indicator
    expect(screen.getByText(/\+1 more notification/i)).toBeInTheDocument();
  });

  it("rapid additions don't clobber each other's timers", () => {
    function RapidAdder() {
      const { addToast } = useToast();
      return (
        <button
          onClick={() => {
            for (let i = 1; i <= 3; i++) {
              addToast(`Msg ${i}`, "info", 2000);
            }
          }}
        >
          rapid
        </button>
      );
    }
    renderWithProvider(<RapidAdder />);
    fireEvent.click(screen.getByRole("button", { name: /rapid/i }));

    expect(screen.getByText("Msg 1")).toBeInTheDocument();
    expect(screen.getByText("Msg 2")).toBeInTheDocument();
    expect(screen.getByText("Msg 3")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText("Msg 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Msg 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Msg 3")).not.toBeInTheDocument();
  });

  describe("info variant", () => {
    it("renders with polite aria-live semantics", () => {
      renderWithProvider(<AddButton variant="info" message="Heads up" />);
      fireEvent.click(screen.getByRole("button", { name: /add info/i }));

      const toast = screen.getByRole("status");
      expect(toast).toHaveAttribute("aria-live", "polite");
      expect(toast).toHaveAttribute("aria-atomic", "true");
      expect(screen.getByText("Heads up")).toBeInTheDocument();
      // Label shown
      expect(screen.getByText("Info")).toBeInTheDocument();
    });
  });

  describe("warning variant", () => {
    it("renders with assertive aria-live semantics", () => {
      renderWithProvider(<AddButton variant="warning" message="Watch out" />);
      fireEvent.click(screen.getByRole("button", { name: /add warning/i }));

      const toast = screen.getByRole("alert");
      expect(toast).toHaveAttribute("aria-live", "assertive");
      expect(screen.getByText("Watch out")).toBeInTheDocument();
    });
  });

  describe("error variant", () => {
    it("renders with assertive aria-live semantics", () => {
      renderWithProvider(<AddButton variant="error" message="Oh no" />);
      fireEvent.click(screen.getByRole("button", { name: /add error/i }));

      const toast = screen.getByRole("alert");
      expect(toast).toHaveAttribute("aria-live", "assertive");
    });
  });

  describe("security", () => {
    it("renders toast message as text, not HTML", () => {
      const xss = '<img src=x onerror="alert(1)">';
      renderWithProvider(<AddButton message={xss} />);
      fireEvent.click(screen.getByRole("button", { name: /add success/i }));

      const el = screen.getByText(xss);
      // textContent equals the raw string, meaning it was not parsed as HTML
      expect(el.textContent).toBe(xss);
      expect(el.querySelector("img")).toBeNull();
    });
  });

  it("throws if useToast is used outside provider", () => {
    // Suppress console.error for this expected throw
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bad() {
      useToast();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(
      "useToast must be used inside <ToastProvider>",
    );
    spy.mockRestore();
  });
});
