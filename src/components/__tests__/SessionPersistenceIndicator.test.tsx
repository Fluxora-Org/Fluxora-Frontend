import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SessionPersistenceIndicator from "../SessionPersistenceIndicator";

describe("SessionPersistenceIndicator", () => {
  it("exposes an accessible label explaining what is being remembered", () => {
    render(<SessionPersistenceIndicator recentlySaved={false} />);

    expect(
      screen.getByRole("img", {
        name: "Your filters and search are saved on this device",
      }),
    ).toBeInTheDocument();
  });

  it("carries a native title so mouse users get the same text on hover", () => {
    render(<SessionPersistenceIndicator recentlySaved={false} />);

    expect(
      screen.getByRole("img", {
        name: "Your filters and search are saved on this device",
      }),
    ).toHaveAttribute("title", "Your filters and search are saved on this device");
  });

  it("does not set data-recently-saved when recentlySaved is false", () => {
    render(<SessionPersistenceIndicator recentlySaved={false} />);

    expect(
      screen.getByRole("img", { name: /saved on this device/i }),
    ).not.toHaveAttribute("data-recently-saved");
  });

  it("sets data-recently-saved when recentlySaved is true", () => {
    render(<SessionPersistenceIndicator recentlySaved={true} />);

    expect(
      screen.getByRole("img", { name: /saved on this device/i }),
    ).toHaveAttribute("data-recently-saved", "true");
  });
});
