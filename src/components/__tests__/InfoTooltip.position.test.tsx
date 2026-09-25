import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InfoTooltip from "../InfoTooltip";

// A first-paint checkpoint excludes passive effects. Positioning must still
// complete through a layout effect before the tooltip can be painted.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();

  return {
    ...react,
    useEffect: () => undefined,
  };
});

describe("InfoTooltip positioning", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders the flipped position before passive effects run", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.classList.contains("info-tooltip-trigger")) {
          return {
            top: 700,
            bottom: 720,
            left: 400,
            right: 416,
            width: 16,
            height: 20,
            x: 400,
            y: 700,
            toJSON: () => ({}),
          };
        }

        return {
          top: 720,
          bottom: 920,
          left: 300,
          right: 620,
          width: 320,
          height: 200,
          x: 300,
          y: 720,
          toJSON: () => ({}),
        };
      },
    );

    render(
      <InfoTooltip
        id="position-tooltip"
        title="Position Test"
        content="Position content"
        ariaLabel="Position tooltip"
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /position tooltip/i }),
    );

    expect(screen.getByRole("dialog")).toHaveClass("info-tooltip-popover--top");
  });
});
