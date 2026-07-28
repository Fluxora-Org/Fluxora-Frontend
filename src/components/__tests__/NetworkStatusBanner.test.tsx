// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import NetworkStatusBanner from "../NetworkStatusBanner";
import type { UseNetworkStatusValue } from "../../hooks/useNetworkStatus";

function renderWithState(status: UseNetworkStatusValue | null) {
  return render(
    <I18nProvider>
      <NetworkStatusBanner status={status} />
    </I18nProvider>,
  );
}

describe("NetworkStatusBanner — renders state-shaped chrome", () => {
  afterEach(() => cleanup());

  it("renders nothing when status is online-nominal", () => {
    const { container } = renderWithState("online-nominal");
    expect(container.firstChild).toBeNull();
  });

  it("renders the expanded banner for 'slow' with polite live semantics", () => {
    renderWithState("slow");
    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("data-state", "slow");
    expect(banner).toHaveAttribute("data-variant", "expanded");
    expect(banner).toHaveAttribute("aria-live", "polite");
  });

  it("renders the expanded banner for 'offline' with assertive live semantics", () => {
    renderWithState("offline");
    const banner = screen.getByRole("alert");
    expect(banner).toHaveAttribute("data-state", "offline");
    expect(banner).toHaveAttribute("aria-live", "assertive");
    expect(banner).toHaveAttribute("data-tone", "error");
  });

  it("renders the warning-toned chip for 'reconnecting'", () => {
    renderWithState("reconnecting");
    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("data-state", "reconnecting");
    expect(banner).toHaveAttribute("data-tone", "warning");
  });

  it("renders 'reconnected-confirmation' as a pill (success tone) with a close button", () => {
    renderWithState("reconnected-confirmation");
    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("data-variant", "pill");
    expect(banner).toHaveAttribute("data-tone", "success");
    expect(banner.querySelector("button[aria-label]")).not.toBeNull();
  });
});
