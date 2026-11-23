import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WidgetErrorBoundary from "../WidgetErrorBoundary";

/** A widget that always throws during render. */
function CrashingWidget(): never {
  throw new Error("widget exploded");
}

describe("WidgetErrorBoundary", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs every caught render error; keep the suite output readable.
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("renders its children when nothing throws", () => {
    render(
      <WidgetErrorBoundary name="Summary">
        <div>summary widget</div>
      </WidgetErrorBoundary>,
    );

    expect(screen.getByText("summary widget")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("contains a crash to its own widget and leaves its siblings mounted", () => {
    render(
      <>
        <WidgetErrorBoundary name="Summary">
          <div>summary widget</div>
        </WidgetErrorBoundary>
        <WidgetErrorBoundary name="Recent streams">
          <CrashingWidget />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary name="Activity">
          <div>activity widget</div>
        </WidgetErrorBoundary>
      </>,
    );

    // The failing widget is replaced by its own fallback...
    const fallback = screen.getByRole("alert");
    expect(fallback).toHaveAttribute("data-widget-error", "Recent streams");
    expect(
      screen.getByText("Recent streams could not be displayed"),
    ).toBeInTheDocument();

    // ...while the widgets around it are untouched.
    expect(screen.getByText("summary widget")).toBeInTheDocument();
    expect(screen.getByText("activity widget")).toBeInTheDocument();
  });

  it("retries the widget, remounts it, and notifies the caller once", () => {
    let shouldCrash = true;
    const onRetry = vi.fn(() => {
      shouldCrash = false;
    });

    function FlakyWidget() {
      if (shouldCrash) throw new Error("transient render failure");
      return <div>recovered widget</div>;
    }

    render(
      <WidgetErrorBoundary name="Flaky" onRetry={onRetry}>
        <FlakyWidget />
      </WidgetErrorBoundary>,
    );

    expect(screen.queryByText("recovered widget")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry Flaky" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByText("recovered widget")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports the error and survives a reporter that throws", () => {
    const onError = vi.fn(() => {
      throw new Error("telemetry sink is down");
    });

    render(
      <WidgetErrorBoundary name="Summary" onError={onError}>
        <CrashingWidget />
      </WidgetErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("supports a custom fallback with its own retry control", () => {
    let shouldCrash = true;

    function FlakyWidget() {
      if (shouldCrash) throw new Error("transient");
      return <div>custom recovered</div>;
    }

    render(
      <WidgetErrorBoundary
        name="Summary"
        fallback={({ retry }) => (
          <button type="button" onClick={retry}>
            custom retry
          </button>
        )}
      >
        <FlakyWidget />
      </WidgetErrorBoundary>,
    );

    expect(screen.queryByText("custom recovered")).not.toBeInTheDocument();

    shouldCrash = false;
    fireEvent.click(screen.getByRole("button", { name: "custom retry" }));

    expect(screen.getByText("custom recovered")).toBeInTheDocument();
  });
});
