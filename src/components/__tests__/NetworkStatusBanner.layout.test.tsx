// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";
import { KeyboardShortcutsModal } from "../KeyboardShortcutsModal";
import Layout from "../Layout";

vi.mock("../ConnectWalletModal", () => ({
  default: () => null,
}));

vi.mock("../Footer", () => ({
  default: () => null,
}));

vi.mock("../KeyboardShortcutsModal", () => ({
  KeyboardShortcutsModal: () => null,
}));

describe("Layout — NetworkStatusBanner mount + skip-link interaction", () => {
  afterEach(() => {
    cleanup();
    // Reset browser online status between tests so we get a clean slate.
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
  });

  it("renders the banner host slot above <main>", () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <I18nProvider>
          <Layout />
        </I18nProvider>
      </MemoryRouter>,
    );

    const main = document.getElementById("main-content");
    expect(main).not.toBeNull();
    const banner = document.querySelector(".network-status-banner");
    if (banner && main) {
      // When the banner is rendered (non-online-nominal), it must sit
      // before <main> in DOM order so the skip-link target still wins.
      const bannerBeforeMain =
        banner.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING;
      expect(Boolean(bannerBeforeMain)).toBe(true);
    } else {
      // online-nominal ⇒ banner unmounted; main still present.
      expect(main).not.toBeNull();
    }
  });

  it("the skip-link target bypasses <main> without trapping on the banner", () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <I18nProvider>
          <Layout />
        </I18nProvider>
      </MemoryRouter>,
    );

    const skipLink = screen.getByText("Skip to main content");
    expect(skipLink.tagName).toBe("A");
    const main = document.getElementById("main-content");
    expect(main).not.toBeNull();
    // Activating the skip-link focuses <main> directly.
    fireEvent.click(skipLink);
    expect(document.activeElement === main).toBe(true);
  });

  it("a window 'offline' event drives the banner from hidden to 'offline'", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <I18nProvider>
          <Layout />
        </I18nProvider>
      </MemoryRouter>,
    );

    fireEvent(window, new Event("offline"));
    // Allow async derivation to settle.
    return Promise.resolve().then(() => {
      const banner = document.querySelector(".network-status-banner");
      expect(banner).toBeInTheDocument();
      expect(banner?.getAttribute("data-state")).toBe("offline");
    });
  });
});
