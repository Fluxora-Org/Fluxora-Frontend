import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Home from "./Home";
import { ThemeProvider } from "../theme/ThemeProvider";

function renderHome() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("Home canonical landing page", () => {
  it("combines the landing, value proposition, trust, CTA, newsletter, and footer sections", () => {
    renderHome();

    expect(
      screen.getByRole("heading", { level: 1, name: /treasury streaming/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /treasury streaming infrastructure/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/powered by stellar/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /ready to start streaming/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /stay updated on stellar ecosystem streaming/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/built on stellar/i).length).toBeGreaterThan(0);
  });
});
