import { sanitizeStellarAddress } from "../data/streamRecords";
import {
  ACCOUNT_BROWSER_STORAGE_CLEARED_EVENT,
  getBrowserStorage,
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from "./browserStorage";

export const ADDRESS_BOOK_STORAGE_KEY = "fluxora_address_book";
export const ADDRESS_BOOK_SCHEMA_VERSION = 1 as const;
export const MAX_ADDRESS_BOOK_ENTRIES = 100;
export const MAX_ADDRESS_BOOK_LABEL_LENGTH = 64;

export interface AddressBookEntry {
  address: string;
  label: string;
}

type AddressBookStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

const EMPTY_ENTRIES: AddressBookEntry[] = [];
const listeners = new Set<() => void>();
let addressBookSnapshot: AddressBookEntry[] | undefined;

function getLocalStorage(): Storage | null {
  return getBrowserStorage("localStorage");
}

function validateAddress(value: unknown): string | null {
  const address = sanitizeStellarAddress(value);
  return address.length === 56 ? address : null;
}

function validateEntry(value: unknown): AddressBookEntry | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const address = validateAddress(record.address);
  const label = typeof record.label === "string" ? record.label.trim() : "";
  if (
    !address ||
    label.length === 0 ||
    label.length > MAX_ADDRESS_BOOK_LABEL_LENGTH
  ) {
    return null;
  }

  return { address, label };
}

function decodeEnvelope(value: unknown): AddressBookEntry[] | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const envelope = value as Record<string, unknown>;
  if (
    envelope.version !== ADDRESS_BOOK_SCHEMA_VERSION ||
    !Array.isArray(envelope.data)
  ) {
    return null;
  }

  const entries: AddressBookEntry[] = [];
  const addresses = new Set<string>();
  for (const candidate of envelope.data) {
    const entry = validateEntry(candidate);
    if (!entry || addresses.has(entry.address)) continue;
    addresses.add(entry.address);
    entries.push(entry);
    if (entries.length === MAX_ADDRESS_BOOK_ENTRIES) break;
  }
  return entries;
}

function publish(entries: AddressBookEntry[]): void {
  addressBookSnapshot = entries;
  listeners.forEach((listener) => listener());
}

function persist(
  entries: AddressBookEntry[],
  storage: AddressBookStorage | null,
): boolean {
  const written = writeBrowserStorage(
    ADDRESS_BOOK_STORAGE_KEY,
    JSON.stringify({
      version: ADDRESS_BOOK_SCHEMA_VERSION,
      data: entries,
    }),
    storage,
  );
  if (storage === getLocalStorage()) publish(entries);
  return written;
}

export function readAddressBook(
  storage: AddressBookStorage | null = getLocalStorage(),
): AddressBookEntry[] {
  if (!storage) return EMPTY_ENTRIES;

  const raw = readBrowserStorage(ADDRESS_BOOK_STORAGE_KEY, storage);
  if (raw === null) return EMPTY_ENTRIES;

  try {
    const entries = decodeEnvelope(JSON.parse(raw) as unknown);
    if (entries) return entries;
  } catch {
    // Invalid JSON is treated like any other hostile stored value.
  }

  if (typeof storage.removeItem === "function") {
    removeBrowserStorage(ADDRESS_BOOK_STORAGE_KEY, storage);
  }
  return EMPTY_ENTRIES;
}

export function writeAddressBook(
  entries: AddressBookEntry[],
  storage: AddressBookStorage | null = getLocalStorage(),
): boolean {
  if (entries.length > MAX_ADDRESS_BOOK_ENTRIES) {
    throw new RangeError(
      `Address book cannot contain more than ${MAX_ADDRESS_BOOK_ENTRIES} entries.`,
    );
  }
  const validated = entries.map((entry) => validateEntry(entry));
  if (validated.some((entry) => entry === null)) {
    throw new TypeError("Address book entries must have a valid address and label.");
  }
  const uniqueEntries = validated as AddressBookEntry[];
  if (new Set(uniqueEntries.map((entry) => entry.address)).size !== uniqueEntries.length) {
    throw new TypeError("Address book addresses must be unique.");
  }
  return persist(uniqueEntries, storage);
}

export function addAddressBookEntry(
  addressValue: unknown,
  labelValue: unknown,
  storage: AddressBookStorage | null = getLocalStorage(),
): boolean {
  const entry = validateEntry({ address: addressValue, label: labelValue });
  if (!entry) {
    throw new TypeError("Enter a valid Stellar address and a label of 1–64 characters.");
  }
  const entries = readAddressBook(storage);
  if (entries.some((existing) => existing.address === entry.address)) {
    throw new TypeError("That address is already saved.");
  }
  if (entries.length >= MAX_ADDRESS_BOOK_ENTRIES) {
    throw new RangeError(
      `Address book cannot contain more than ${MAX_ADDRESS_BOOK_ENTRIES} entries.`,
    );
  }
  return persist([...entries, entry], storage);
}

export function renameAddressBookEntry(
  addressValue: unknown,
  labelValue: unknown,
  storage: AddressBookStorage | null = getLocalStorage(),
): boolean {
  const address = validateAddress(addressValue);
  const label = typeof labelValue === "string" ? labelValue.trim() : "";
  if (!address || label.length === 0 || label.length > MAX_ADDRESS_BOOK_LABEL_LENGTH) {
    throw new TypeError("Enter a label of 1–64 characters.");
  }
  const entries = readAddressBook(storage);
  if (!entries.some((entry) => entry.address === address)) {
    throw new TypeError("That saved address no longer exists.");
  }
  return persist(
    entries.map((entry) =>
      entry.address === address ? { address, label } : entry,
    ),
    storage,
  );
}

export function deleteAddressBookEntry(
  addressValue: unknown,
  storage: AddressBookStorage | null = getLocalStorage(),
): boolean {
  const address = validateAddress(addressValue);
  if (!address) throw new TypeError("Enter a valid Stellar address.");
  return persist(
    readAddressBook(storage).filter((entry) => entry.address !== address),
    storage,
  );
}

export function exportAddressBookJson(
  storage: AddressBookStorage | null = getLocalStorage(),
): string {
  return JSON.stringify(
    {
      version: ADDRESS_BOOK_SCHEMA_VERSION,
      data: readAddressBook(storage),
    },
    null,
    2,
  );
}

export function importAddressBookJson(
  raw: string,
  storage: AddressBookStorage | null = getLocalStorage(),
): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("The selected file is not valid JSON.");
  }

  const imported = decodeEnvelope(parsed);
  if (!imported) {
    throw new TypeError("The selected file is not a supported address book.");
  }

  const current = readAddressBook(storage);
  const merged = new Map(current.map((entry) => [entry.address, entry]));
  imported.forEach((entry) => merged.set(entry.address, entry));
  if (merged.size > MAX_ADDRESS_BOOK_ENTRIES) {
    throw new RangeError(
      `Import would exceed the ${MAX_ADDRESS_BOOK_ENTRIES}-recipient limit.`,
    );
  }
  return persist(Array.from(merged.values()), storage);
}

export function subscribeToAddressBook(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAddressBookSnapshot(): AddressBookEntry[] {
  if (!addressBookSnapshot) addressBookSnapshot = readAddressBook();
  return addressBookSnapshot;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === ADDRESS_BOOK_STORAGE_KEY) {
      addressBookSnapshot = readAddressBook();
      listeners.forEach((listener) => listener());
    }
  });
  window.addEventListener(ACCOUNT_BROWSER_STORAGE_CLEARED_EVENT, () => {
    addressBookSnapshot = EMPTY_ENTRIES;
    listeners.forEach((listener) => listener());
  });
}
