import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RecipientStreams, Stream } from "../recipient/RecipientStreams";

const mockData: Stream[] = [
  { id: "1", sender: "Alice", amount: "500", status: "active" }
];

describe("RecipientStreams Testing Engine", () => {
  it("shows safe recoverable loading elements on initial interaction", async () => {
    const fetchMock = jest.fn().mockReturnValue(new Promise((resolve) => setTimeout(() => resolve(mockData), 50)));
    
    render(<RecipientStreams fetchStreamsFn={fetchMock} />);
    expect(screen.getByText("Refreshing...")).toBeInTheDocument();
  });

  it("safely displays a secure error fallback upon network failure", async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error("Database crash dump info"));
    
    render(<RecipientStreams fetchStreamsFn={fetchMock} />);
    const errorAlert = await screen.findByRole("status");
    
    expect(errorAlert).toBeInTheDocument();
    expect(screen.queryByText("Database crash dump info")).not.toBeInTheDocument();
  });

  it("guards against concurrent execution calls when double-clicked", async () => {
    let callCount = 0;
    const fetchMock = jest.fn().mockImplementation(() => {
      callCount++;
      return new Promise((resolve) => setTimeout(() => resolve(mockData), 100));
    });

    render(<RecipientStreams fetchStreamsFn={fetchMock} />);
    const btn = screen.getByText("Refreshing...");
    
    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(callCount).toBe(1); // Second and third rapid clicks are completely blocked
  });
});