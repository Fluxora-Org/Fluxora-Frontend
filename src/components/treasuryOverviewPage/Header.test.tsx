import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Header from "./Header";

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

describe("Treasury Header refresh control", () => {
  it("announces completion after a manual metrics refresh", () => {
    const onRefresh = vi.fn();
    render(<Header onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh metrics" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Treasury metrics refresh completed.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });
});
