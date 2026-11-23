import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ADDRESS_BOOK_SCHEMA_VERSION,
  ADDRESS_BOOK_STORAGE_KEY,
  addAddressBookEntry,
  deleteAddressBookEntry,
  exportAddressBookJson,
  importAddressBookJson,
  readAddressBook,
  renameAddressBookEntry,
} from "../addressBook";
import { ACCOUNT_BROWSER_STORAGE_CLEARED_EVENT } from "../browserStorage";

const ADDRESS = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

beforeEach(() => {
  localStorage.clear();
  window.dispatchEvent(new Event(ACCOUNT_BROWSER_STORAGE_CLEARED_EVENT));
});

afterEach(() => {
  localStorage.clear();
  window.dispatchEvent(new Event(ACCOUNT_BROWSER_STORAGE_CLEARED_EVENT));
});

describe("address book", () => {
  it("persists, renames, deletes, and round-trips versioned JSON", () => {
    addAddressBookEntry(ADDRESS, "Payroll");
    expect(readAddressBook()).toEqual([{ address: ADDRESS, label: "Payroll" }]);

    renameAddressBookEntry(ADDRESS, "Operations");
    expect(readAddressBook()).toEqual([{ address: ADDRESS, label: "Operations" }]);

    const exported = exportAddressBookJson();
    localStorage.removeItem(ADDRESS_BOOK_STORAGE_KEY);
    importAddressBookJson(exported);
    expect(readAddressBook()).toEqual([{ address: ADDRESS, label: "Operations" }]);

    deleteAddressBookEntry(ADDRESS);
    expect(readAddressBook()).toEqual([]);
  });

  it("ignores hostile stored envelopes and entry values", () => {
    localStorage.setItem(
      ADDRESS_BOOK_STORAGE_KEY,
      JSON.stringify({
        version: ADDRESS_BOOK_SCHEMA_VERSION,
        data: [
          { address: ADDRESS, label: { html: "<img src=x onerror=alert(1)>" } },
          { address: "javascript:alert(1)", label: "Injected" },
          { address: ADDRESS, label: "   " },
        ],
      }),
    );

    expect(readAddressBook()).toEqual([]);
  });

  it("clears unparseable or unsupported stored versions", () => {
    localStorage.setItem(
      ADDRESS_BOOK_STORAGE_KEY,
      JSON.stringify({ version: ADDRESS_BOOK_SCHEMA_VERSION + 1, data: [] }),
    );

    expect(readAddressBook()).toEqual([]);
    expect(localStorage.getItem(ADDRESS_BOOK_STORAGE_KEY)).toBeNull();
  });

  it("rejects invalid addresses and overlong labels on writes", () => {
    expect(() => addAddressBookEntry("bad-address", "Bad")).toThrow(
      /valid Stellar address/i,
    );
    expect(() =>
      addAddressBookEntry(ADDRESS, "x".repeat(65)),
    ).toThrow(/valid Stellar address/i);
  });
});
