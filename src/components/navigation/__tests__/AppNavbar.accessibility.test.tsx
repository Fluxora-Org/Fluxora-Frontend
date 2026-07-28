// Feature: touch-target-accessibility, Property 3
// Feature: touch-target-accessibility, Property 4

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useState } from "react";
import * as fc from "fast-check";
import AppNavbar from "../AppNavbar";
import { ThemeProvider } from "../../../theme/ThemeProvider";

// Mock useWallet — connected + on an /app route so the sidebar toggle
// (the only hamburger AppNavbar renders) is present.
vi.mock("../../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    connected: true,
    address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV",
    network: "TESTNET",
    loading: false,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    disconnect: () => {},
  }),
}));

vi.mock("../../voice/VoiceMicButton", () => ({
  VoiceMicButton: () => <div data-testid="mock-voice-mic-button" />,
}));

// Mock useTickingNow to avoid infinite loops in vi.runAllTimers()
vi.mock("../../../hooks/useTickingNow", () => ({
  useTickingNow: () => "2026-07-24T05:07:26.000Z",
}));

// Mock react-router-dom — /app route so isAppView is true
vi.mock("react-router-dom", () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.PropsWithChildren<{ to: string; [key: string]: unknown }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/app" }),
}));

/**
 * The sidebar toggle is a controlled component (aria-expanded mirrors the
 * isSidebarOpen prop). Wire it up the same way App.tsx does so clicking the
 * hamburger actually flips the state under test.
 */
function NavbarSidebarHarness() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <ThemeProvider>
      <AppNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((prev) => !prev)}
      />
    </ThemeProvider>
  );
}

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    store,
    getItem(key: string) { return store[key] || null; },
    setItem(key: string, value: string) { store[key] = String(value); },
    removeItem(key: string) { delete store[key]; },
    clear() { for (const k in store) delete store[k]; },
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/**
 * Property 3: Icon-only buttons carry descriptive aria-labels
 * Validates: Requirements 4.1, 4.2, 4.3
 */
describe("Property 3: Icon-only buttons have non-empty aria-labels", () => {
  it(
    "hamburger and theme toggle aria-labels are non-empty for any mobileOpen/theme combination",
    () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.constantFrom("light" as const, "dark" as const),
          (_mobileOpen, theme) => {
            // Seed the persisted choice so the provider initialises with it.
            localStorage.setItem("theme", theme);
            const { unmount } = render(
              <ThemeProvider>
                <AppNavbar />
              </ThemeProvider>
            );

            // Flush the connecting setTimeout
            act(() => {
              vi.runAllTimers();
            });

            // Sidebar toggle (hamburger) — only hamburger in AppNavbar
            const hamburger = screen.getByRole("button", {
              name: /open navigation sidebar|close navigation sidebar/i,
            });
            const hamburgerLabel = hamburger.getAttribute("aria-label");
            expect(hamburgerLabel).toBeTruthy();
            expect(hamburgerLabel!.length).toBeGreaterThan(0);

            // Theme preference segmented control
            const themeControls = screen.getAllByRole("radiogroup", {
              name: /theme preference/i,
            });
            expect(themeControls.length).toBeGreaterThanOrEqual(1);
            themeControls.forEach((group) => {
              const label = group.getAttribute("aria-label");
              expect(label).toBeTruthy();
              expect(label!.length).toBeGreaterThan(0);
            });

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    },
    15000
  );
});

/**
 * Property 4: Sidebar toggle aria-expanded reflects sidebar state
 * Validates: Requirements 4.4
 */
describe("Property 4: aria-expanded reflects sidebar open state", () => {
  it(
    "aria-expanded on the sidebar toggle equals current open/closed state after each click",
    () => {
      fc.assert(
        fc.property(
          fc.array(fc.constant("click"), { minLength: 0, maxLength: 10 }),
          (clicks) => {
            localStorage.setItem("theme", "dark");
            const { unmount } = render(<NavbarSidebarHarness />);

            // Flush connecting skeleton timer
            act(() => {
              vi.runAllTimers();
            });

            let expectedOpen = false;

            // Verify initial state
            const initialBtn = screen.getByRole("button", {
              name: /open navigation sidebar|close navigation sidebar/i,
            });
            expect(initialBtn.getAttribute("aria-expanded")).toBe(
              String(expectedOpen)
            );

            for (const _ of clicks) {
              const btn = screen.getByRole("button", {
                name: /open navigation sidebar|close navigation sidebar/i,
              });
              act(() => {
                fireEvent.click(btn);
              });
              expectedOpen = !expectedOpen;

              const updatedBtn = screen.getByRole("button", {
                name: /open navigation sidebar|close navigation sidebar/i,
              });
              expect(updatedBtn.getAttribute("aria-expanded")).toBe(
                String(expectedOpen)
              );
            }

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

describe("Property 5: Easy-read font toggle", () => {
  it("has non-empty aria-label and updates aria-pressed on click", () => {
    render(
      <ThemeProvider>
        <AppNavbar />
      </ThemeProvider>
    );

    // Flush connecting skeleton timer
    act(() => {
      vi.runAllTimers();
    });

    const fontToggles = screen.getAllByRole("button", {
      name: /toggle easy-read font/i,
    });
    expect(fontToggles.length).toBeGreaterThanOrEqual(1);

    fontToggles.forEach((btn) => {
      const label = btn.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
      expect(btn.getAttribute("aria-pressed")).toBe("false");
    });

    // Click the first toggle button
    act(() => {
      fireEvent.click(fontToggles[0]);
    });

    // Verify it updates state and mirrors to aria-pressed
    expect(fontToggles[0].getAttribute("aria-pressed")).toBe("true");
  });
});
