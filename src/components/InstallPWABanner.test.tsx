import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  InstallPWABanner,
  PWA_BANNER_REMIND_LATER_MS,
  PWA_BANNER_STORAGE_KEY,
} from "./InstallPWABanner";

type InstallOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptHarness {
  event: Event;
  prompt: ReturnType<typeof vi.fn>;
}

/**
 * jsdom has no `beforeinstallprompt` implementation, so this builds the same
 * shape the browser hands to the component: a cancelable event carrying a
 * `prompt()` trigger and a `userChoice` promise.
 */
function createBeforeInstallPromptEvent(
  outcome: InstallOutcome = "accepted",
): BeforeInstallPromptHarness {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  const prompt = vi.fn(() => Promise.resolve());
  Object.defineProperties(event, {
    prompt: { value: prompt },
    platforms: { value: ["web"] },
    userChoice: {
      value: Promise.resolve({ outcome, platform: "web" }),
    },
  });
  return { event, prompt };
}

/** Fires the install prompt the way the browser would, inside `act`. */
function showInstallPrompt(outcome: InstallOutcome = "accepted") {
  const harness = createBeforeInstallPromptEvent(outcome);
  act(() => {
    window.dispatchEvent(harness.event);
  });
  return harness;
}

function mockDisplayMode(standalone: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query === "(display-mode: standalone)" ? standalone : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const banner = () => screen.queryByRole("region", { name: "Install App" });
const announcement = () => screen.getByRole("status");

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockDisplayMode(false);
});

describe("InstallPWABanner visibility", () => {
  it("renders no banner until the browser offers an install prompt", () => {
    render(<InstallPWABanner />);

    expect(banner()).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    // The live region stays mounted but silent until something is announced.
    expect(announcement().textContent).toBe("");
  });

  it("stays hidden when the app already runs in standalone display mode", () => {
    mockDisplayMode(true);
    render(<InstallPWABanner />);

    showInstallPrompt();

    expect(banner()).not.toBeInTheDocument();
  });

  it("stays hidden after a permanent dismissal", () => {
    localStorage.setItem(PWA_BANNER_STORAGE_KEY, "permanently");
    render(<InstallPWABanner />);

    showInstallPrompt();

    expect(banner()).not.toBeInTheDocument();
  });

  it("stays hidden while a remind-later delay is still pending", () => {
    localStorage.setItem(
      PWA_BANNER_STORAGE_KEY,
      String(Date.now() + PWA_BANNER_REMIND_LATER_MS),
    );
    render(<InstallPWABanner />);

    showInstallPrompt();

    expect(banner()).not.toBeInTheDocument();
  });

  it("returns once a remind-later delay has elapsed", () => {
    localStorage.setItem(
      PWA_BANNER_STORAGE_KEY,
      String(Date.now() - 1000),
    );
    render(<InstallPWABanner />);

    showInstallPrompt();

    expect(banner()).toBeInTheDocument();
  });

  it("appears on beforeinstallprompt and suppresses the default mini-infobar", () => {
    render(<InstallPWABanner />);

    const { event } = showInstallPrompt();

    expect(event.defaultPrevented).toBe(true);
    expect(banner()).toBeInTheDocument();
    expect(banner()).toHaveTextContent("Install Fluxora");
    expect(
      screen.getByText(/offline access, and easy access from your home screen/i),
    ).toBeInTheDocument();
  });
});

describe("InstallPWABanner keyboard access", () => {
  it("exposes every interactive element as a native, focusable button", () => {
    render(<InstallPWABanner />);
    showInstallPrompt();

    const controls = screen.getAllByRole("button");
    expect(controls).toHaveLength(3);
    for (const control of controls) {
      expect(control.tagName).toBe("BUTTON");
      expect(control).toHaveAttribute("type", "button");
      // Native buttons are tab stops by default; nothing is removed from the
      // tab sequence with tabIndex=-1 or `disabled`.
      expect(control.tabIndex).toBe(0);
      expect(control).toBeEnabled();
    }
  });

  it("reaches the controls by Tab in visual order with no extra stops", async () => {
    const user = userEvent.setup();
    render(<InstallPWABanner />);
    showInstallPrompt();

    await user.tab();
    expect(screen.getByRole("button", { name: "Install" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Remind me later" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Dismiss permanently" })).toHaveFocus();

    // Nothing inside the banner traps focus: the next Tab leaves it.
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it("activates Install from the keyboard with Enter", async () => {
    const user = userEvent.setup();
    render(<InstallPWABanner />);
    const { prompt } = showInstallPrompt("accepted");

    await user.tab();
    await user.keyboard("{Enter}");

    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(banner()).not.toBeInTheDocument());
  });

  it("dismisses the banner via the icon control from the keyboard", async () => {
    const user = userEvent.setup();
    render(<InstallPWABanner />);
    showInstallPrompt();

    await user.tab();
    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");

    expect(banner()).not.toBeInTheDocument();
    expect(localStorage.getItem(PWA_BANNER_STORAGE_KEY)).toBe("permanently");
  });

  it("activates Remind me later from the keyboard with Space", async () => {
    const user = userEvent.setup();
    render(<InstallPWABanner />);
    showInstallPrompt();
    const now = Date.now();

    await user.tab();
    await user.tab();
    await user.keyboard(" ");

    expect(banner()).not.toBeInTheDocument();
    const stored = Number(localStorage.getItem(PWA_BANNER_STORAGE_KEY));
    expect(stored).toBeGreaterThanOrEqual(now + PWA_BANNER_REMIND_LATER_MS);
    expect(stored).toBeLessThanOrEqual(
      Date.now() + PWA_BANNER_REMIND_LATER_MS,
    );
  });
});

describe("InstallPWABanner accessible names", () => {
  it("names the banner region", () => {
    render(<InstallPWABanner />);
    showInstallPrompt();

    expect(banner()).toBeInTheDocument();
    expect(banner()).toHaveAttribute("aria-label", "Install App");
  });

  it("gives every control a distinct accessible name", () => {
    render(<InstallPWABanner />);
    showInstallPrompt();

    const names = screen
      .getAllByRole("button")
      .map((control) => control.getAttribute("aria-label") ?? control.textContent);

    expect(names).toEqual(["Install", "Remind me later", "Dismiss permanently"]);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name?.trim()).not.toBe("");
    }
  });

  it("hides the decorative dismiss icon from assistive technology", () => {
    render(<InstallPWABanner />);
    showInstallPrompt();

    const dismiss = screen.getByRole("button", { name: "Dismiss permanently" });
    const icon = dismiss.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    // The accessible name comes from the aria-label, not the icon.
    expect(dismiss).toHaveAttribute("aria-label", "Dismiss permanently");
  });
});

describe("InstallPWABanner focus visibility", () => {
  const css = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/InstallPWABanner.css"),
    "utf8",
  );

  it("defines a :focus-visible ring for every banner control", () => {
    const focusRule = css.match(/\.pwa-banner__btn:focus-visible\s*\{[^}]*\}/);
    expect(focusRule, "expected a .pwa-banner__btn:focus-visible rule").not.toBeNull();
    // Every control shares the .pwa-banner__btn class, so one rule covers all
    // three tab stops.
    expect(focusRule?.[0]).toMatch(/outline:\s*2px solid #06B6D4/i);
    expect(focusRule?.[0]).toMatch(/outline-offset:\s*2px/);
  });

  it("never removes the outline without replacing it", () => {
    expect(css).not.toMatch(/\.pwa-banner__btn[^{]*\{[^}]*outline:\s*none/);
  });

  it("keeps focus on a control that the focus ring styles", async () => {
    const user = userEvent.setup();
    render(<InstallPWABanner />);
    showInstallPrompt();

    for (const name of ["Install", "Remind me later", "Dismiss permanently"]) {
      await user.tab();
      const control = screen.getByRole("button", { name });
      expect(control).toHaveFocus();
      expect(control).toHaveClass("pwa-banner__btn");
    }
  });
});

describe("InstallPWABanner state announcements", () => {
  it("exposes a polite, atomic live region that is visually hidden", () => {
    render(<InstallPWABanner />);

    expect(announcement()).toHaveAttribute("aria-live", "polite");
    expect(announcement()).toHaveAttribute("aria-atomic", "true");
    expect(announcement()).toHaveClass("sr-only");
  });

  it("announces the banner when it becomes available", () => {
    render(<InstallPWABanner />);

    showInstallPrompt();

    expect(announcement()).toHaveTextContent(/can be installed on this device/i);
  });

  it("announces a started installation after the banner is removed", async () => {
    const user = userEvent.setup();
    render(<InstallPWABanner />);
    showInstallPrompt("accepted");

    await user.click(screen.getByRole("button", { name: "Install" }));

    await waitFor(() => expect(banner()).not.toBeInTheDocument());
    expect(announcement()).toHaveTextContent(/installation started/i);
    expect(localStorage.getItem(PWA_BANNER_STORAGE_KEY)).toBe("permanently");
  });

  it("announces an incomplete installation and keeps the banner available", async () => {
    const user = userEvent.setup();
    render(<InstallPWABanner />);
    showInstallPrompt("dismissed");

    await user.click(screen.getByRole("button", { name: "Install" }));

    await waitFor(() => expect(announcement()).toHaveTextContent(/not installed/i));
    expect(banner()).toBeInTheDocument();
    expect(localStorage.getItem(PWA_BANNER_STORAGE_KEY)).toBeNull();
  });

  it("does not reuse an install event the browser already consumed", async () => {
    const user = userEvent.setup();
    render(<InstallPWABanner />);
    const { prompt } = showInstallPrompt("dismissed");

    await user.click(screen.getByRole("button", { name: "Install" }));
    await waitFor(() => expect(announcement()).toHaveTextContent(/not installed/i));

    // A beforeinstallprompt event can only be prompted once; the component
    // clears it, so a second activation is a safe no-op instead of throwing.
    await user.click(screen.getByRole("button", { name: "Install" }));

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(banner()).toBeInTheDocument();
  });

  it("announces a permanent dismissal after the banner is removed", async () => {
    const user = userEvent.setup();
    render(<InstallPWABanner />);
    showInstallPrompt();

    await user.click(screen.getByRole("button", { name: "Dismiss permanently" }));

    expect(banner()).not.toBeInTheDocument();
    expect(announcement()).toHaveTextContent(/install banner dismissed/i);
    expect(announcement()).toHaveTextContent(/browser menu/i);
  });

  it("announces the seven-day remind-later delay", async () => {
    const user = userEvent.setup();
    render(<InstallPWABanner />);
    showInstallPrompt();

    await user.click(screen.getByRole("button", { name: "Remind me later" }));

    expect(banner()).not.toBeInTheDocument();
    expect(announcement()).toHaveTextContent(/7 days/i);
  });
});

describe("InstallPWABanner automated accessibility checks", () => {
  it("has no axe violations while visible", async () => {
    const { container } = render(<InstallPWABanner />);
    showInstallPrompt();

    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });

  it("has no axe violations after the banner is dismissed", async () => {
    const user = userEvent.setup();
    const { container } = render(<InstallPWABanner />);
    showInstallPrompt();

    await user.click(screen.getByRole("button", { name: "Dismiss permanently" }));

    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });
});
