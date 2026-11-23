import { forwardRef, useId, useRef, useState } from "react";
import type {
  CompositionEvent,
  InputHTMLAttributes,
  KeyboardEvent,
} from "react";
import { formatAddress } from "./common/TruncatedAddress";
import { sanitizeStellarAddress } from "../data/streamRecords";
import { MAX_ADDRESS_BOOK_LABEL_LENGTH } from "../lib/addressBook";
import { useAddressBook } from "../hooks/useAddressBook";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> & {
  value: string;
  onRecipientChange: (value: string) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

function downloadJson(json: string): void {
  const url = URL.createObjectURL(
    new Blob([json], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "fluxora-address-book.json";
  link.click();
  URL.revokeObjectURL(url);
}

const RecipientAddressPicker = forwardRef<HTMLInputElement, Props>(
  function RecipientAddressPicker(
    {
      value,
      onRecipientChange,
      id,
      className,
      onChange,
      onBlur,
      onCompositionStart,
      onCompositionEnd,
      onKeyDown,
      ...inputAttributes
    },
    forwardedRef,
  ) {
  const addressBook = useAddressBook();
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-recipients`;
  const isComposingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  const normalizedQuery = value.trim().toLocaleLowerCase();
  const matchingEntries = addressBook.entries.filter(
    (entry) =>
      !normalizedQuery ||
      entry.label.toLocaleLowerCase().includes(normalizedQuery) ||
      entry.address.toLocaleLowerCase().includes(normalizedQuery),
  );
  const selectedLabel = addressBook.getLabelForAddress(value.trim());
  const sanitizedAddress = sanitizeStellarAddress(value.trim());
  const canSaveAddress =
    sanitizedAddress.length === 56 && !selectedLabel;

  const showFeedback = (message: string, isError = false) => {
    setFeedback(message);
    setFeedbackIsError(isError);
  };

  const handleInputChange: NonNullable<Props["onChange"]> = (event) => {
    onRecipientChange(event.currentTarget.value);
    setIsOpen(true);
    setActiveIndex(0);
    onChange?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (isComposingRef.current || event.nativeEvent.isComposing) return;

    if (event.key === "ArrowDown" && matchingEntries.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % matchingEntries.length);
    } else if (event.key === "ArrowUp" && matchingEntries.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(
        (index) => (index - 1 + matchingEntries.length) % matchingEntries.length,
      );
    } else if (
      event.key === "Enter" &&
      isOpen &&
      matchingEntries[activeIndex]
    ) {
      event.preventDefault();
      onRecipientChange(matchingEntries[activeIndex].address);
      setIsOpen(false);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    } else if (event.key === "Tab") {
      setIsOpen(false);
    }
  };

  const saveNewRecipient = () => {
    try {
      const persisted = addressBook.addRecipient(value, newLabel);
      setNewLabel("");
      showFeedback(
        persisted
          ? "Recipient saved."
          : "Recipient saved for this session; browser storage is unavailable.",
      );
    } catch (error) {
      showFeedback(
        error instanceof Error ? error.message : "Could not save this recipient.",
        true,
      );
    }
  };

  const saveRename = (address: string) => {
    try {
      const persisted = addressBook.renameRecipient(address, editingLabel);
      setEditingAddress(null);
      setEditingLabel("");
      showFeedback(
        persisted
          ? "Recipient label updated."
          : "Label updated for this session; browser storage is unavailable.",
      );
    } catch (error) {
      showFeedback(
        error instanceof Error ? error.message : "Could not update this label.",
        true,
      );
    }
  };

  const deleteRecipient = (address: string) => {
    try {
      const persisted = addressBook.deleteRecipient(address);
      showFeedback(
        persisted
          ? "Recipient deleted."
          : "Recipient deleted for this session; browser storage is unavailable.",
      );
    } catch (error) {
      showFeedback(
        error instanceof Error ? error.message : "Could not delete this recipient.",
        true,
      );
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const persisted = addressBook.importJson(await file.text());
      showFeedback(
        persisted
          ? "Address book imported."
          : "Address book imported for this session; browser storage is unavailable.",
      );
    } catch (error) {
      showFeedback(
        error instanceof Error ? error.message : "Could not import this file.",
        true,
      );
    }
  };

  return (
    <div className="space-y-2">
      <input
        {...inputAttributes}
        ref={forwardedRef}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={isOpen && matchingEntries.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={
          isOpen && matchingEntries[activeIndex]
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        className={className ?? "input-field"}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={(event) => {
          onBlur?.(event);
          setIsOpen(false);
        }}
        onCompositionStart={(event: CompositionEvent<HTMLInputElement>) => {
          isComposingRef.current = true;
          onCompositionStart?.(event);
        }}
        onCompositionEnd={(event: CompositionEvent<HTMLInputElement>) => {
          isComposingRef.current = false;
          onCompositionEnd?.(event);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {selectedLabel && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Saved recipient: <span>{selectedLabel}</span>
        </p>
      )}

      <div
        id={listboxId}
        role="listbox"
        aria-label="Saved recipients"
        hidden={!isOpen || matchingEntries.length === 0}
        className="max-h-40 overflow-y-auto rounded-lg border"
        style={{
          borderColor: "var(--color-border-default)",
          backgroundColor: "var(--color-surface-default)",
        }}
      >
        {matchingEntries.map((entry, index) => (
          <div
            id={`${listboxId}-option-${index}`}
            key={entry.address}
            role="option"
            aria-selected={activeIndex === index}
            className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm"
            style={{
              backgroundColor:
                activeIndex === index ? "var(--color-surface-elevated)" : undefined,
            }}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => {
              onRecipientChange(entry.address);
              setIsOpen(false);
            }}
          >
            <span>{entry.label}</span>
            <code className="text-xs" aria-label={`Address ${formatAddress(entry.address)}`}>
              {formatAddress(entry.address)}
            </code>
          </div>
        ))}
      </div>
      {isOpen && matchingEntries.length === 0 && addressBook.entries.length > 0 && (
        <p role="status" className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          No saved recipients match.
        </p>
      )}

      {canSaveAddress && (
        <button
          type="button"
          className="text-sm font-medium underline"
          onClick={() => setIsManaging(true)}
        >
          Save this recipient with a label
        </button>
      )}
      <button
        type="button"
        className="text-sm font-medium underline"
        aria-expanded={isManaging}
        onClick={() => setIsManaging((open) => !open)}
      >
        {isManaging ? "Close recipient manager" : "Manage saved recipients"}
      </button>

      {isManaging && (
        <section
          aria-label="Manage saved recipients"
          className="space-y-3 rounded-lg border p-3"
          style={{ borderColor: "var(--color-border-default)" }}
        >
          {canSaveAddress && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveNewRecipient();
              }}
            >
              <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
                Label for this address
                <input
                  type="text"
                  value={newLabel}
                  maxLength={MAX_ADDRESS_BOOK_LABEL_LENGTH}
                  onChange={(event) => setNewLabel(event.currentTarget.value)}
                  className="input-field"
                />
              </label>
              <button type="submit" className="rounded border px-3 py-2 text-sm">
                Save recipient
              </button>
            </form>
          )}

          {addressBook.entries.length === 0 ? (
            <p className="text-sm">No recipients saved yet.</p>
          ) : (
            <ul className="space-y-2">
              {addressBook.entries.map((entry) => (
                <li
                  key={entry.address}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  {editingAddress === entry.address ? (
                    <>
                      <input
                        aria-label={`Rename ${entry.label}`}
                        type="text"
                        value={editingLabel}
                        maxLength={MAX_ADDRESS_BOOK_LABEL_LENGTH}
                        onChange={(event) => setEditingLabel(event.currentTarget.value)}
                        className="input-field min-w-32 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => saveRename(entry.address)}
                      >
                        Save label
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAddress(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{entry.label}</span>
                      <code>{formatAddress(entry.address)}</code>
                      <button
                        type="button"
                        aria-label={`Rename ${entry.label}`}
                        onClick={() => {
                          setEditingAddress(entry.address);
                          setEditingLabel(entry.label);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${entry.label}`}
                        onClick={() => deleteRecipient(entry.address)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                try {
                  downloadJson(addressBook.exportJson());
                  showFeedback("Address book exported.");
                } catch (error) {
                  showFeedback(
                    error instanceof Error
                      ? error.message
                      : "Could not export the address book.",
                    true,
                  );
                }
              }}
            >
              Export JSON
            </button>
            <label className="cursor-pointer text-sm underline">
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label="Import address book JSON"
                onChange={(event) => {
                  void importFile(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </section>
      )}

      {feedback && (
        <p
          role={feedbackIsError ? "alert" : "status"}
          aria-live={feedbackIsError ? "assertive" : "polite"}
          className="text-sm"
          style={{
            color: feedbackIsError
              ? "var(--color-danger)"
              : "var(--color-text-muted)",
          }}
        >
          {feedback}
        </p>
      )}
    </div>
  );
  },
);

export default RecipientAddressPicker;
