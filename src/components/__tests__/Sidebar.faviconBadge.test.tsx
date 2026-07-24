import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "../Sidebar";
import { VoiceProvider } from "../voice/VoiceContext";

describe("Sidebar in-page unread badge fallback & reset", () => {
  it("renders in-page badge with single digit count and accessible label", () => {
    render(
      <MemoryRouter>
        <VoiceProvider>
          <Sidebar
            collapsed={false}
            onToggleCollapse={() => {}}
            mobileOpen={false}
            onMobileClose={() => {}}
            unreadCount={3}
          />
        </VoiceProvider>
      </MemoryRouter>
    );

    const badge = screen.getByTestId("in-page-unread-badge");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe("3");
    expect(badge).toHaveAttribute("aria-label", "3 unread events");
  });

  it("renders '9+' overflow state for unread counts over 9", () => {
    render(
      <MemoryRouter>
        <VoiceProvider>
          <Sidebar
            collapsed={false}
            onToggleCollapse={() => {}}
            mobileOpen={false}
            onMobileClose={() => {}}
            unreadCount={14}
          />
        </VoiceProvider>
      </MemoryRouter>
    );

    const badge = screen.getByTestId("in-page-unread-badge");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe("9+");
    expect(badge).toHaveAttribute("aria-label", "More than 9 unread events");
  });

  it("does not render in-page badge when unreadCount is 0", () => {
    render(
      <MemoryRouter>
        <VoiceProvider>
          <Sidebar
            collapsed={false}
            onToggleCollapse={() => {}}
            mobileOpen={false}
            onMobileClose={() => {}}
            unreadCount={0}
          />
        </VoiceProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("in-page-unread-badge")).not.toBeInTheDocument();
  });

  it("triggers onResetUnread when Recipient nav link is clicked", () => {
    const handleReset = vi.fn();
    render(
      <MemoryRouter>
        <VoiceProvider>
          <Sidebar
            collapsed={false}
            onToggleCollapse={() => {}}
            mobileOpen={false}
            onMobileClose={() => {}}
            unreadCount={5}
            onResetUnread={handleReset}
          />
        </VoiceProvider>
      </MemoryRouter>
    );

    const recipientLink = screen.getByRole("link", { name: /recipient/i });
    fireEvent.click(recipientLink);

    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
