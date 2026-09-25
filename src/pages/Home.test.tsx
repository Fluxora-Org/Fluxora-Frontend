import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../theme/ThemeProvider";
import Home from "./Home";

const CONNECT_CTA_LABEL = /connect wallet to launch/i;

function renderHomeWithoutWallet() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("landing page without a wallet", () => {
  beforeEach(() => {
    // jsdom provides an IntersectionObserver that never reports intersections,
    // which would keep the lazy below-the-fold sections stuck as skeletons.
    // Making it unavailable exercises LazySection's documented immediate-load
    // fallback (older browsers, jsdom/SSR) so the whole page actually renders.
    vi.stubGlobal("IntersectionObserver", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("renders every landing section without requiring a wallet", async () => {
    renderHomeWithoutWallet();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /the future of treasury streaming/i,
      }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Treasury streaming infrastructure",
      }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", {
        name: /trusted stellar treasury patterns/i,
      }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { name: "Ready to start streaming?" }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", {
        name: "Stay updated on Stellar ecosystem streaming",
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("uses calls to action that state what connecting a wallet will do", async () => {
    renderHomeWithoutWallet();

    // The hero CTA renders eagerly and states the connecting step, and the
    // get-started CTA states the same once its lazy chunk has resolved.
    const ctas = await screen.findAllByRole("button", {
      name: CONNECT_CTA_LABEL,
    });
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    for (const cta of ctas) {
      expect(cta).toBeEnabled();
    }
  });

  it("shows no wallet-restoring or connecting placeholder", async () => {
    renderHomeWithoutWallet();

    await screen.findByRole("heading", {
      level: 1,
      name: /the future of treasury streaming/i,
    });

    expect(
      screen.queryByLabelText(/connecting wallet/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/loading wallet/i),
    ).not.toBeInTheDocument();
  });

  it("exposes the primary call to action to the keyboard", async () => {
    renderHomeWithoutWallet();

    const hero = screen.getByRole("region", {
      name: /the future of treasury streaming/i,
    });
    const cta = within(hero).getByRole("button", {
      name: CONNECT_CTA_LABEL,
    });
    expect(cta).toBeEnabled();

    cta.focus();
    expect(document.activeElement).toBe(cta);
  });
});