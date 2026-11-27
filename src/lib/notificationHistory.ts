import { useEffect, useRef, useSyncExternalStore } from "react";
import { subscribeToAccountContext } from "./accountContextSync";
import { hashIdentifier, redactIdentifiers } from "./stellar/telemetry";

export const NOTIFICATION_HISTORY_STORAGE_KEY =
  "fluxora:notification-history:v1";
export const MAX_NOTIFICATION_HISTORY = 50;

export const NOTIFICATION_KINDS = [
  "stream-created",
  "withdraw",
  "transaction-confirmed",
  "transaction-failed",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_VARIANTS = [
  "success",
  "error",
  "info",
  "warning",
] as const;
export type NotificationVariant = (typeof NOTIFICATION_VARIANTS)[number];

export interface NotificationHistoryEntry {
  id: string;
  kind: NotificationKind;
  variant: NotificationVariant;
  message: string;
  reference?: string;
  timestamp: number;
  read: boolean;
}

export interface RecordNotificationInput {
  message: string;
  kind?: NotificationKind;
  variant?: NotificationVariant;
  reference?: string;
  timestamp?: number;
  read?: boolean;
}

export interface NotificationAccountContext {
  address?: string | null;
  network?: string | null;
  connected?: boolean;
}

const EMPTY_ENTRIES: readonly NotificationHistoryEntry[] = Object.freeze([]);
const KIND_SET = new Set<string>(NOTIFICATION_KINDS);
const VARIANT_SET = new Set<string>(NOTIFICATION_VARIANTS);
const ADDRESS_RE = /^G[ABCDEFGHIJKLMNOPQRSTUVWXYZ234567]{55}$/;
const HASH_RE = /^[0-9a-fA-F]{64}$/;
const SCOPE_RE = /^[0-9a-f]{8}$/;
const MAX_MESSAGE_LENGTH = 300;
const MAX_REFERENCE_LENGTH = 120;

export function accountKeyFor(
  address?: string | null,
  network?: string | null,
): string {
  return hashIdentifier(`${network ?? "unknown"}:${address ?? "anonymous"}`);
}

export function truncateNotificationReference(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (ADDRESS_RE.test(trimmed) || HASH_RE.test(trimmed)) {
    return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
  }
  const redacted = redactIdentifiers(trimmed);
  return redacted.length > MAX_REFERENCE_LENGTH
    ? `${redacted.slice(0, MAX_REFERENCE_LENGTH - 1)}…`
    : redacted;
}

function sanitizeMessage(value: string): string {
  const redacted = redactIdentifiers(value.trim());
  return redacted.length > MAX_MESSAGE_LENGTH
    ? redacted.slice(0, MAX_MESSAGE_LENGTH - 1) + "…"
    : redacted;
}

function isEntry(value: unknown): value is NotificationHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<NotificationHistoryEntry>;
  return (
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    entry.id.length <= MAX_REFERENCE_LENGTH &&
    typeof entry.kind === "string" &&
    KIND_SET.has(entry.kind) &&
    typeof entry.variant === "string" &&
    VARIANT_SET.has(entry.variant) &&
    typeof entry.message === "string" &&
    entry.message.length > 0 &&
    typeof entry.timestamp === "number" &&
    Number.isFinite(entry.timestamp) &&
    entry.timestamp > 0 &&
    typeof entry.read === "boolean" &&
    (entry.reference === undefined ||
      (typeof entry.reference === "string" &&
        entry.reference.length <= MAX_REFERENCE_LENGTH))
  );
}

function sanitizeEntry(entry: NotificationHistoryEntry): NotificationHistoryEntry {
  const message = sanitizeMessage(entry.message);
  const reference =
    typeof entry.reference === "string"
      ? truncateNotificationReference(entry.reference)
      : undefined;
  return Object.freeze({
    ...entry,
    message,
    ...(reference ? { reference } : { reference: undefined }),
  });
}

function safeGetItem(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(NOTIFICATION_HISTORY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeSetItem(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTIFICATION_HISTORY_STORAGE_KEY, value);
  } catch {
    return;
  }
}

function readScopes(): Record<string, NotificationHistoryEntry[]> {
  const raw = safeGetItem();
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Record<string, NotificationHistoryEntry[]> = {};
    for (const [scope, value] of Object.entries(parsed)) {
      if (!SCOPE_RE.test(scope) || !Array.isArray(value)) continue;
      const entries = value
        .filter(isEntry)
        .slice(0, MAX_NOTIFICATION_HISTORY)
        .map(sanitizeEntry);
      if (entries.length > 0) result[scope] = entries;
    }
    return result;
  } catch {
    return {};
  }
}

let scopes: Record<string, NotificationHistoryEntry[]> | null = null;
let activeScope = accountKeyFor(null, null);
let snapshot: readonly NotificationHistoryEntry[] = EMPTY_ENTRIES;
const listeners = new Set<() => void>();
let storageListening = false;

function handleStorage(event: StorageEvent): void {
  if (event.key !== NOTIFICATION_HISTORY_STORAGE_KEY) return;
  scopes = readScopes();
  setSnapshot([...(scopes[activeScope] ?? [])]);
  listeners.forEach((listener) => listener());
}

function ensureInitialized(): void {
  if (scopes) return;
  scopes = readScopes();
  setSnapshot([...(scopes[activeScope] ?? [])]);
  if (!storageListening && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
    storageListening = true;
  }
}

function setSnapshot(entries: NotificationHistoryEntry[]): void {
  snapshot = Object.freeze(entries);
}

function persist(): void {
  safeSetItem(JSON.stringify(scopes!));
}

function commit(): void {
  persist();
  setSnapshot([...(scopes?.[activeScope] ?? [])]);
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  ensureInitialized();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotificationHistory(): readonly NotificationHistoryEntry[] {
  ensureInitialized();
  return snapshot;
}

export function getUnreadNotificationCount(): number {
  return getNotificationHistory().filter((entry) => !entry.read).length;
}

function getServerSnapshot(): readonly NotificationHistoryEntry[] {
  return EMPTY_ENTRIES;
}

export function useNotificationHistory(): readonly NotificationHistoryEntry[] {
  return useSyncExternalStore(subscribe, getNotificationHistory, getServerSnapshot);
}

export function useUnreadNotificationCount(): number {
  const entries = useNotificationHistory();
  return entries.reduce((total, entry) => total + (entry.read ? 0 : 1), 0);
}

export function setNotificationAccount(
  address?: string | null,
  network?: string | null,
): void {
  ensureInitialized();
  const nextScope = accountKeyFor(address, network);
  if (nextScope === activeScope) return;
  activeScope = nextScope;
  setSnapshot([...(scopes?.[activeScope] ?? [])]);
  listeners.forEach((listener) => listener());
}

export function recordNotification(
  input: RecordNotificationInput,
): NotificationHistoryEntry | null {
  ensureInitialized();
  const message = sanitizeMessage(input.message);
  if (!message) return null;

  const kind = input.kind && KIND_SET.has(input.kind)
    ? input.kind
    : input.variant === "error"
      ? "transaction-failed"
      : "transaction-confirmed";
  const variant =
    input.variant && VARIANT_SET.has(input.variant) ? input.variant : "info";
  const timestamp =
    typeof input.timestamp === "number" &&
    Number.isFinite(input.timestamp) &&
    input.timestamp > 0
      ? input.timestamp
      : Date.now();
  const reference =
    typeof input.reference === "string"
      ? truncateNotificationReference(input.reference)
      : undefined;

  const entry = Object.freeze({
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${timestamp}-${Math.random().toString(36).slice(2)}`,
    kind,
    variant,
    message,
    ...(reference ? { reference } : { reference: undefined }),
    timestamp,
    read: input.read === true,
  }) as NotificationHistoryEntry;

  const current = scopes?.[activeScope] ?? [];
  if (scopes) {
    scopes[activeScope] = [entry, ...current].slice(0, MAX_NOTIFICATION_HISTORY);
  }
  commit();
  return entry;
}

export function markNotificationRead(id: string): void {
  ensureInitialized();
  const current = scopes![activeScope];
  if (!current) return;
  const next = current.map((entry) =>
    entry.id === id && !entry.read ? { ...entry, read: true } : entry,
  );
  scopes![activeScope] = next;
  commit();
}

export function markAllNotificationsRead(): void {
  ensureInitialized();
  const current = scopes![activeScope];
  if (!current) return;
  scopes![activeScope] = current.map((entry) =>
    entry.read ? entry : { ...entry, read: true },
  );
  commit();
}

export function clearNotificationHistory(scope = activeScope): void {
  ensureInitialized();
  if (!scopes![scope]) return;
  delete scopes![scope];
  commit();
}

export function resetNotificationHistoryForTests(): void {
  activeScope = accountKeyFor(null, null);
  scopes = null;
  setSnapshot(EMPTY_ENTRIES);
}

export function useNotificationAccountSync({
  address = null,
  network = null,
  connected = false,
}: NotificationAccountContext): void {
  const owner = connected ? address : null;
  const scope = accountKeyFor(owner, network);
  const lastScope = useRef<string | null>(null);

  useEffect(() => {
    const previous = lastScope.current;
    lastScope.current = scope;

    const channel = subscribeToAccountContext((message) => {
      const incomingOwner = message.connected ? message.address : null;
      const incomingScope = accountKeyFor(incomingOwner, message.network);
      if (incomingScope === lastScope.current) return;
      lastScope.current = incomingScope;
      setNotificationAccount(incomingOwner, message.network);
      clearNotificationHistory();
    });

    channel.publish({
      type: "account-context",
      address: owner,
      network,
      connected,
      changedAt: Date.now(),
      source: "notification-center",
    });

    if (previous === null) {
      setNotificationAccount(owner, network);
    } else if (previous !== scope) {
      setNotificationAccount(owner, network);
      clearNotificationHistory();
    }

    return () => channel.close();
  }, [address, network, connected, scope, owner]);
}
