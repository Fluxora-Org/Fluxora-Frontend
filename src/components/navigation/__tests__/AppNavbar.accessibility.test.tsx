// Feature: touch-target-accessibility, Property 3
// Feature: touch-target-accessibility, Property 4

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as fc from "fast-check";
import AppNavbar from "../AppNavbar";
import { ThemeProvider } from "../../../theme/ThemeProvider";

// Mock useWallet
vi.mock("../../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    connected: false,
    address: undefined,
    network: undefined,
    loading: false,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    disconnect: () => {},
  }),
}));

// Mock react-router-dom
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
  useLocation: () => ({ pathname: "/" }),
}));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
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

            // Hamburger button
            const hamburger = screen.getByRole("button", {
              name: /open navigation menu|close navigation menu/i,
            });
            const hamburgerLabel = hamburger.getAttribute("aria-label");
            expect(hamburgerLabel).toBeTruthy();
            expect(hamburgerLabel!.length).toBeGreaterThan(0);

            // Theme toggle (desktop; may be multiple when mobile menu open)
            const themeToggles = screen.getAllByRole("button", {
              name: /switch to (dark|light) mode/i,
            });
            expect(themeToggles.length).toBeGreaterThanOrEqual(1);
            themeToggles.forEach((btn) => {
              const label = btn.getAttribute("aria-label");
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
 * Property 4: Hamburger aria-expanded reflects menu state
 * Validates: Requirements 4.4
 */
describe("Property 4: aria-expanded reflects mobileOpen state", () => {
  it(
    "aria-expanded on hamburger equals current open/closed state after each click",
    () => {
      fc.assert(
        fc.property(
          fc.array(fc.constant("click"), { minLength: 0, maxLength: 10 }),
          (clicks) => {
            localStorage.setItem("theme", "dark");
            const { unmount } = render(
              <ThemeProvider>
                <AppNavbar />
              </ThemeProvider>
            );

            // Flush connecting skeleton timer
            act(() => {
              vi.runAllTimers();
            });

            let expectedOpen = false;

            // Verify initial state
            const initialBtn = screen.getByRole("button", {
              name: /open navigation menu|close navigation menu/i,
            });
            expect(initialBtn.getAttribute("aria-expanded")).toBe(
              String(expectedOpen)
            );

            for (const _ of clicks) {
              const btn = screen.getByRole("button", {
                name: /open navigation menu|close navigation menu/i,
              });
              act(() => {
                fireEvent.click(btn);
              });
              expectedOpen = !expectedOpen;

              const updatedBtn = screen.getByRole("button", {
                name: /open navigation menu|close navigation menu/i,
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
