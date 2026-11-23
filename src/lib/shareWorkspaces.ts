/**
 * In-memory connection state for Slack / Teams share workspaces.
 * Never persist workspace identities or OAuth connection state in browser
 * storage; the real OAuth integration must keep credentials server-side.
 */

export type ShareProvider = "slack" | "teams";

export type ShareFlowState =
  | "idle"
  | "not-connected"
  | "connecting"
  | "connected-channel-picker"
  | "sending"
  | "sent"
  | "send-failed";

export const SHARE_WORKSPACES_KEY = "fluxora-share-workspaces";
export const SHARE_WORKSPACES_CHANGED_EVENT = "fluxora-share-workspaces-changed";
let connectedWorkspaces: ConnectedShareWorkspace[] = [];

function notifyWorkspacesChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SHARE_WORKSPACES_CHANGED_EVENT));
}

export interface ConnectedShareWorkspace {
  provider: ShareProvider;
  workspaceName: string;
  teamId: string;
}

export interface ShareChannel {
  id: string;
  name: string;
}

/** Mock channel catalogs used by the channel-picker combobox. */
export const MOCK_SHARE_CHANNELS: Record<ShareProvider, ShareChannel[]> = {
  slack: [
    { id: "C-GENERAL", name: "general" },
    { id: "C-PAYROLL", name: "payroll" },
    { id: "C-ENGINEERING", name: "engineering" },
    { id: "C-TREASURY", name: "treasury" },
  ],
  teams: [
    { id: "T-GENERAL", name: "General" },
    { id: "T-FINANCE", name: "Finance" },
    { id: "T-OPS", name: "Operations" },
    { id: "T-PAYROLL", name: "Payroll sync" },
  ],
};

const PROVIDER_LABEL: Record<ShareProvider, string> = {
  slack: "Slack",
  teams: "Microsoft Teams",
};

export function getShareProviderLabel(provider: ShareProvider): string {
  return PROVIDER_LABEL[provider];
}

export function readConnectedWorkspaces(): ConnectedShareWorkspace[] {
  return [...connectedWorkspaces];
}

export function writeConnectedWorkspaces(
  workspaces: ConnectedShareWorkspace[],
): void {
  connectedWorkspaces = workspaces.filter(isConnectedShareWorkspace);
  notifyWorkspacesChanged();
}

export function getConnectedWorkspace(
  provider: ShareProvider,
): ConnectedShareWorkspace | undefined {
  return readConnectedWorkspaces().find((w) => w.provider === provider);
}

export function isProviderConnected(provider: ShareProvider): boolean {
  return Boolean(getConnectedWorkspace(provider));
}

export function connectWorkspace(
  provider: ShareProvider,
  workspaceName?: string,
): ConnectedShareWorkspace {
  const existing = readConnectedWorkspaces().filter(
    (w) => w.provider !== provider,
  );
  const next: ConnectedShareWorkspace = {
    provider,
    workspaceName:
      workspaceName ??
      (provider === "slack" ? "Fluxora HQ" : "Fluxora Contoso"),
    teamId: provider === "slack" ? "T-SLACK-DEMO" : "T-TEAMS-DEMO",
  };
  writeConnectedWorkspaces([...existing, next]);
  return next;
}

export function disconnectWorkspace(provider: ShareProvider): void {
  writeConnectedWorkspaces(
    readConnectedWorkspaces().filter((w) => w.provider !== provider),
  );
}

function isConnectedShareWorkspace(
  value: unknown,
): value is ConnectedShareWorkspace {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.provider === "slack" || candidate.provider === "teams") &&
    typeof candidate.workspaceName === "string" &&
    typeof candidate.teamId === "string"
  );
}
