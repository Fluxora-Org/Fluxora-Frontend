import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GetStartedCTA from "../GetStartedCTA";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("GetStartedCTA", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders tokenized styles without hardcoded colors", () => {
    render(<GetStartedCTA />);

    expect(
      screen.getByRole("heading", { name: "Ready to start streaming?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /launch dashboard/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view documentation/i }),
    ).toBeInTheDocument();

    const source = readFileSync(
      join(process.cwd(), "src/components/GetStartedCTA.tsx"),
      "utf8",
    );

    const colorValues = Array.from(
      source.matchAll(
        /\b(?:background(?:Color)?|border(?:Color)?|boxShadow|color):\s*"([^"]+)"/g,
      ),
      (match) => match[1],
    );

    expect(colorValues.length).toBeGreaterThan(0);
    colorValues.forEach((value) => {
      const tokenlessValue = value
        .replace(/var\(--[\w-]+\)/g, "")
        .replace(/\b(?:linear-gradient|solid|transparent|none)\b/g, "")
        .replace(/-?(?:\d*\.\d+|\d+)(?:px|%|deg)?/g, "")
        .replace(/[\s(),]+/g, "");

      expect(tokenlessValue).toBe("");
    });
    expect(source).toContain("var(--color-text-primary)");
    expect(source).toContain("var(--color-cta-primary-text)");
  });

  it("toggles the primary and secondary hover styles", () => {
    render(<GetStartedCTA />);

    const primaryButton = screen.getByRole("button", {
      name: /launch dashboard/i,
    });
    const secondaryButton = screen.getByRole("button", {
      name: /view documentation/i,
    });

    expect(primaryButton.style.transform).toBe("");
    fireEvent.mouseEnter(primaryButton);
    expect(primaryButton.style.filter).toBe("brightness(1.05)");
    expect(primaryButton.style.transform).toBe("translateY(-1px)");
    expect(primaryButton.style.boxShadow).toBe(
      "var(--shadow-cta-primary-hover)",
    );
    fireEvent.mouseLeave(primaryButton);
    expect(primaryButton.style.filter).toBe("");
    expect(primaryButton.style.transform).toBe("");
    expect(primaryButton.style.boxShadow).toBe("var(--shadow-cta-primary)");

    expect(secondaryButton.style.backgroundColor).toBe("transparent");
    fireEvent.mouseEnter(secondaryButton);
    expect(secondaryButton.style.backgroundColor).toBe(
      "var(--color-surface-raised)",
    );
    expect(secondaryButton.style.borderColor).toBe(
      "var(--color-border-secondary)",
    );
    fireEvent.mouseLeave(secondaryButton);
    expect(secondaryButton.style.backgroundColor).toBe("transparent");
    expect(secondaryButton.style.borderColor).toBe("");
  });

  it("navigates to the dashboard from the primary action", async () => {
    const user = userEvent.setup();
    render(<GetStartedCTA />);

    await user.click(screen.getByRole("button", { name: /launch dashboard/i }));

    expect(mockNavigate).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});
