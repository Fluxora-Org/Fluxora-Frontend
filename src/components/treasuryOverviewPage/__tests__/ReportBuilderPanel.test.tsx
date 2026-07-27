import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReportBuilderPanel from "../ReportBuilderPanel";
import { Stream } from "../Stream";
// Mock the toast provider to prevent errors during rendering
vi.mock("../../toast/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

describe("ReportBuilderPanel", () => {
  const mockStreams: Stream[] = [
    { id: "1", name: "Stream 1", recipient: "Recipient 1", rate: "10 USDC", status: "Active" },
  ];

  it("renders without hardcoded bg-white classes and uses design tokens", () => {
    const { container } = render(
      <ReportBuilderPanel streams={mockStreams} onClose={() => {}} />
    );

    // Verify the panel renders
    expect(screen.getByRole("heading", { name: /Export Treasury Report/i })).toBeInTheDocument();

    // Check that there is no bg-white anywhere in the container
    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      if (typeof el.className === "string") {
        expect(el.className).not.toContain("bg-white");
      }
    });

    // Assert design-token inline styles are applied to the root element
    const rootElement = container.firstChild as HTMLElement;
    expect(rootElement).toBeInTheDocument();
    
    const rootStyle = rootElement.getAttribute("style") || "";
    expect(rootStyle).toContain("var(--color-bg-primary)");
  });
});
