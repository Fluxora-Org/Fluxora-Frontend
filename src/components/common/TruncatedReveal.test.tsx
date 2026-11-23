import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import TruncatedReveal from "./TruncatedReveal";

const FULL_ADDRESS = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
const TRUNCATED_ADDRESS = "GATDOS...LOWN";

describe("TruncatedReveal states", () => {
  it("renders the loading state properly when provided loading indicators", () => {
    render(
      <TruncatedReveal fullValue="Loading account details...">
        <span role="status" aria-label="Loading address">
          Loading...
        </span>
      </TruncatedReveal>,
    );

    expect(screen.getByRole("status", { name: "Loading address" })).toBeVisible();
    expect(screen.getByText("Loading account details...")).toBeInTheDocument();
  });

  it("renders the empty state properly when fullValue is empty", () => {
    const { container } = render(
      <TruncatedReveal fullValue="">
        <span data-testid="empty-label">None</span>
      </TruncatedReveal>,
    );

    expect(screen.getByTestId("empty-label")).toBeVisible();
    expect(screen.getByTestId("empty-label")).toHaveTextContent("None");

    const srSpan = container.querySelector(".truncateReveal__srValue.srOnly");
    expect(srSpan).toBeInTheDocument();
    expect(srSpan).toHaveTextContent("");

    const chip = container.querySelector(".truncateReveal__chip");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("");
  });

  it("renders the error state asserting what the user actually sees", () => {
    render(
      <TruncatedReveal fullValue="Failed to resolve address GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN">
        <span role="alert" className="text-red-500">
          Invalid address format
        </span>
      </TruncatedReveal>,
    );

    const alertElement = screen.getByRole("alert");
    expect(alertElement).toBeVisible();
    expect(alertElement).toHaveTextContent("Invalid address format");

    expect(
      screen.getByText(
        "Failed to resolve address GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
      ),
    ).toBeInTheDocument();
  });

  it("renders the populated state displaying the truncated content and full value overlay", () => {
    const { container } = render(
      <TruncatedReveal fullValue={FULL_ADDRESS}>
        <code>{TRUNCATED_ADDRESS}</code>
      </TruncatedReveal>,
    );

    expect(screen.getByText(TRUNCATED_ADDRESS)).toBeVisible();

    const srSpan = container.querySelector(".truncateReveal__srValue.srOnly");
    expect(srSpan).toBeInTheDocument();
    expect(srSpan).toHaveTextContent(FULL_ADDRESS);

    const chip = container.querySelector(".truncateReveal__chip");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent(FULL_ADDRESS);
    expect(chip).toHaveAttribute("aria-hidden", "true");
  });

  it("reveals the full value chip on pointer hover without console errors or act warnings", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TruncatedReveal fullValue={FULL_ADDRESS}>
        <code>{TRUNCATED_ADDRESS}</code>
      </TruncatedReveal>,
    );

    const wrapper = container.querySelector(".truncateReveal");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveAttribute("data-revealed", "false");

    await user.hover(wrapper!);
    expect(wrapper).toHaveAttribute("data-revealed", "true");

    await user.unhover(wrapper!);
    expect(wrapper).toHaveAttribute("data-revealed", "false");
  });

  it("reveals the full value chip on focus and conceals on blur", () => {
    const { container } = render(
      <TruncatedReveal fullValue={FULL_ADDRESS}>
        <button type="button">Copy</button>
      </TruncatedReveal>,
    );

    const wrapper = container.querySelector(".truncateReveal");
    expect(wrapper).toHaveAttribute("data-revealed", "false");

    fireEvent.focus(wrapper!);
    expect(wrapper).toHaveAttribute("data-revealed", "true");

    fireEvent.blur(wrapper!);
    expect(wrapper).toHaveAttribute("data-revealed", "false");
  });
});
