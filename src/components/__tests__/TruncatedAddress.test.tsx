import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TruncatedAddress from "../common/TruncatedAddress";

const ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ2345678901234567890123456789";

function setClipboard(writeText?: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

describe("TruncatedAddress", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies with the Clipboard API and announces success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const onCopy = vi.fn();
    const onCopyStateChange = vi.fn();
    setClipboard(writeText);

    render(
      <TruncatedAddress
        address={ADDRESS}
        onCopy={onCopy}
        onCopyStateChange={onCopyStateChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy address/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ADDRESS));
    expect(onCopy).toHaveBeenCalledWith(ADDRESS);
    expect(onCopyStateChange).toHaveBeenCalledWith("copied");
    expect(screen.getByText("Address copied")).toBeInTheDocument();
  });

  it("falls back to execCommand when Clipboard API is unavailable", async () => {
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    const onCopy = vi.fn();
    setClipboard(undefined);

    render(<TruncatedAddress address={ADDRESS} onCopy={onCopy} />);

    fireEvent.click(screen.getByRole("button", { name: /copy address/i }));

    await waitFor(() => expect(execCommand).toHaveBeenCalledWith("copy"));
    expect(onCopy).toHaveBeenCalledWith(ADDRESS);
    expect(document.querySelector("textarea")).toBeNull();
    expect(screen.getByText("Address copied")).toBeInTheDocument();
  });

  it("announces an error when clipboard permission is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    const onCopy = vi.fn();
    const onCopyStateChange = vi.fn();
    setClipboard(writeText);

    render(
      <TruncatedAddress
        address={ADDRESS}
        onCopy={onCopy}
        onCopyStateChange={onCopyStateChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy address/i }));

    await waitFor(() => expect(onCopyStateChange).toHaveBeenCalledWith("error"));
    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.getByText("Address could not be copied")).toBeInTheDocument();
  });

  it("announces an error when the fallback copy command fails", async () => {
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });
    const onCopyStateChange = vi.fn();
    setClipboard(undefined);

    render(
      <TruncatedAddress address={ADDRESS} onCopyStateChange={onCopyStateChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy address/i }));

    await waitFor(() => expect(onCopyStateChange).toHaveBeenCalledWith("error"));
    expect(screen.getByText("Address could not be copied")).toBeInTheDocument();
  });

  it("resets copied and error state back to idle", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("denied"));
    const onCopyStateChange = vi.fn();
    setClipboard(writeText);

    render(
      <TruncatedAddress address={ADDRESS} onCopyStateChange={onCopyStateChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy address/i }));
    await vi.runAllTimersAsync();
    expect(onCopyStateChange).toHaveBeenCalledWith("idle");

    fireEvent.click(screen.getByRole("button", { name: /copy address/i }));
    await vi.runAllTimersAsync();
    expect(onCopyStateChange).toHaveBeenLastCalledWith("idle");
    vi.useRealTimers();
  });

  it("supports keyboard copy activation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    render(<TruncatedAddress address={ADDRESS} label="Recipient" />);

    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ADDRESS));
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Copied Recipient"),
    );
  });

  it("supports Space key copy activation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    render(<TruncatedAddress address={ADDRESS} />);

    fireEvent.keyDown(screen.getByRole("button"), { key: " " });

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ADDRESS));
  });

  it("renders short addresses without truncation", () => {
    render(<TruncatedAddress address="GSHORT" />);

    expect(screen.getByText("GSHORT")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Copy address"),
    );
  });
});
