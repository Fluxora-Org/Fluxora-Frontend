import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import StreamRow from "../StreamRow";
import type { Stream } from "../Stream";

const stream: Stream = {
  id: "STR-900",
  name: "Security Review Grant",
  recipient: "GABCDEFGHIJKLMNOPQRSTUVWXYZ23456789WXYZ",
  rate: "2,500 USDC/mo",
  accruedAmount: 1234.56,
  status: "Active",
};

function renderRow(rowStream: Stream = stream) {
  const onSelect = vi.fn();

  render(
    <MemoryRouter>
      <table>
        <tbody>
          <StreamRow stream={rowStream} onSelect={onSelect} />
        </tbody>
      </table>
    </MemoryRouter>
  );

  return { onSelect };
}

describe("StreamRow", () => {
  it("truncates long recipient addresses while preserving the full address for assistive text", () => {
    renderRow();

    expect(screen.getByText("GABCDE...WXYZ")).toBeInTheDocument();
    expect(screen.getByLabelText(`Recipient ${stream.recipient}`)).toHaveAttribute(
      "title",
      stream.recipient
    );
  });

  it("renders status and accrued amount formatting for a stream", () => {
    renderRow();

    expect(screen.getByRole("status", { name: "Active status" })).toHaveTextContent("ACTIVE");
    expect(screen.getByText("2,500 USDC/mo")).toBeInTheDocument();
    expect(screen.getByText("1,234.56 USDC accrued")).toBeInTheDocument();
  });

  it("renders dynamic cell content as text instead of HTML", () => {
    const { container } = render(
      <MemoryRouter>
        <table>
          <tbody>
            <StreamRow
              stream={{
                ...stream,
                id: "STR-XSS",
                name: "<script>alert(1)</script>",
                recipient: "<img src=x onerror=alert(1)>",
              }}
              onSelect={vi.fn()}
            />
          </tbody>
        </table>
      </MemoryRouter>
    );

    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});
