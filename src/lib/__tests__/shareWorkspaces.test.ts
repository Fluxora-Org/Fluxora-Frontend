import { beforeEach, describe, expect, it } from "vitest";
import {
  SHARE_WORKSPACES_KEY,
  connectWorkspace,
  disconnectWorkspace,
  getConnectedWorkspace,
  isProviderConnected,
  readConnectedWorkspaces,
} from "../shareWorkspaces";

describe("shareWorkspaces", () => {
  beforeEach(() => {
    window.localStorage.removeItem(SHARE_WORKSPACES_KEY);
  });

  it("connects and disconnects providers independently", () => {
    connectWorkspace("slack");
    connectWorkspace("teams");

    expect(isProviderConnected("slack")).toBe(true);
    expect(isProviderConnected("teams")).toBe(true);
    expect(getConnectedWorkspace("slack")?.workspaceName).toBe("Fluxora HQ");

    disconnectWorkspace("slack");
    expect(isProviderConnected("slack")).toBe(false);
    expect(isProviderConnected("teams")).toBe(true);
    expect(readConnectedWorkspaces()).toHaveLength(1);
  });

  it("ignores malformed storage payloads", () => {
    window.localStorage.setItem(SHARE_WORKSPACES_KEY, "{not-json");
    expect(readConnectedWorkspaces()).toEqual([]);
  });
});
