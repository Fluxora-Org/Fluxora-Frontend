import { afterEach, describe, expect, it } from "vitest";
import { saveSession } from "../sessionRecovery";
import { writeStreamsSession } from "../streamsSessionRecovery";
import { enqueueAction } from "../offlineActionQueue";
import { connectWorkspace, disconnectWorkspace } from "../shareWorkspaces";
import {
  clearAccountBrowserStorage,
} from "../browserStorage";

const PREFERENCE_ALLOWLIST = new Set([
  "theme",
  "easy-read-font",
  "theme:custom",
  "fluxora:treasury:heatmap-view",
  "fluxora:treasury:sankey-view",
  "fluxora:treasury:widget-layout",
  "fluxora.stream-alerts.enabled",
  "toast-sound",
  "FLUXORA_SHORTCUTS_DISABLED",
  "pwa-banner-dismissed",
  "fluxora_onboarding_progress",
  "fluxora_onboarding_dismissed",
]);

afterEach(() => {
  disconnectWorkspace("slack");
  disconnectWorkspace("teams");
  localStorage.clear();
  sessionStorage.clear();
});

describe("browser storage security policy", () => {
  it("keeps session recovery data out of storage and restricts persisted keys to the preference allowlist", () => {
    localStorage.setItem("fluxora:treasury:heatmap-view", "table");
    saveSession("GABC", { secret: "private-key-material", signedPayload: "signed-payload" });
    enqueueAction({ signedPayload: "signed-payload", secret: "private-key-material" });
    connectWorkspace("slack", "Sensitive workspace name");
    writeStreamsSession(
      {
        filters: {
          statusFilter: "All",
          searchQuery: "private-key-material",
          sortBy: "recent",
          currentPage: 1,
          itemsPerPage: 10,
        },
        draft: null,
      },
      Date.now(),
      "GABC",
    );

    const storedKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!);
    expect(storedKeys.every((key) => PREFERENCE_ALLOWLIST.has(key))).toBe(true);
    expect(JSON.stringify(Object.fromEntries(storedKeys.map((key) => [key, localStorage.getItem(key)]))))
      .not.toContain("private-key-material");
    expect(JSON.stringify(Object.fromEntries(storedKeys.map((key) => [key, localStorage.getItem(key)]))))
      .not.toContain("signed-payload");
    expect(sessionStorage.length).toBe(0);
  });

  it("clears session and sensitive account data on disconnect while retaining preferences", () => {
    localStorage.setItem("fluxora:treasury:heatmap-view", "table");
    localStorage.setItem("fluxora_backup_pin", "1234");
    localStorage.setItem("fluxora_streams_session_v2_GABC", "draft");
    sessionStorage.setItem("fluxora_pending_stream_tx", "signed payload");

    clearAccountBrowserStorage();

    expect(localStorage.getItem("fluxora_backup_pin")).toBeNull();
    expect(localStorage.getItem("fluxora_streams_session_v2_GABC")).toBeNull();
    expect(localStorage.getItem("fluxora:treasury:heatmap-view")).toBe("table");
    expect(sessionStorage.length).toBe(0);
  });
});
