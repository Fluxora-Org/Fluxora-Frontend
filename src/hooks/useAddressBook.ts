import { useCallback, useSyncExternalStore } from "react";
import {
  addAddressBookEntry,
  deleteAddressBookEntry,
  exportAddressBookJson,
  getAddressBookSnapshot,
  importAddressBookJson,
  renameAddressBookEntry,
  subscribeToAddressBook,
} from "../lib/addressBook";

const getServerSnapshot = () => [];

export function useAddressBook() {
  const entries = useSyncExternalStore(
    subscribeToAddressBook,
    getAddressBookSnapshot,
    getServerSnapshot,
  );

  const getLabelForAddress = useCallback(
    (address: string | null | undefined) =>
      address
        ? entries.find((entry) => entry.address === address)?.label
        : undefined,
    [entries],
  );

  return {
    entries,
    getLabelForAddress,
    addRecipient: addAddressBookEntry,
    renameRecipient: renameAddressBookEntry,
    deleteRecipient: deleteAddressBookEntry,
    exportJson: exportAddressBookJson,
    importJson: importAddressBookJson,
  };
}
