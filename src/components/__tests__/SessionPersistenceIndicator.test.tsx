import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SessionPersistenceIndicator from "../SessionPersistenceIndicator";
import {
  DEFAULT_STREAMS_FILTERS,
  streamsSessionWriteStatus,
  writeStreamsSession,
} from "../../lib/streamsSessionRecovery";

const ACCOUNT = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
const SAVED_LABEL = "Your filters and search are saved on this device";
const NOT_YET_SAVED_LABEL =
  "Your filters and search haven't been saved on this device yet";
const NOT_SAVED_LABEL = "Your filters and search aren't being saved";
const UNAVAILABLE_MESSAGE =
  /can't be saved in this browser because site data is blocked or storage is full/i;

const originalLocalStorage = Object.getOwnPropertyDescriptor(
  window,
  "localStorage",
);

/** Memory-backed storage whose writes can be made to fail on demand. */
function createStorage() {
  const values = new Map<string, string>();
  const storage = {
    failWith: null as string | null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (storage.failWith) {
        throw new DOMException("Storage write failed", storage.failWith);
      }
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  return storage;
}

function installLocalStorage(storage: ReturnType<typeof createStorage>) {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: storage,
  });
}

/** Simulates "Block site data": accessing window.localStorage throws. */
function blockSiteData() {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
}

/** Runs the real session autosave write against window.localStorage. */
function autosaveSession() {
  act(() => {
    writeStreamsSession(
      { filters: DEFAULT_STREAMS_FILTERS, draft: null },
      Date.now(),
      ACCOUNT,
    );
  });
}

describe("SessionPersistenceIndicator", () => {
  beforeEach(() => {
    streamsSessionWriteStatus.reset();
    installLocalStorage(createStorage());
  });

  afterEach(() => {
    // Unmount before resetting so the reset doesn't update a mounted indicator.
    cleanup();
    if (originalLocalStorage) {
      Object.defineProperty(window, "localStorage", originalLocalStorage);
    }
    streamsSessionWriteStatus.reset();
  });

  describe("before any write", () => {
    it("does not claim persistence", () => {
      render(<SessionPersistenceIndicator recentlySaved={false} />);

      expect(
        screen.getByRole("img", { name: NOT_YET_SAVED_LABEL }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("img", { name: SAVED_LABEL }),
      ).not.toBeInTheDocument();
    });

    it("does not pulse even if recentlySaved is set", () => {
      render(<SessionPersistenceIndicator recentlySaved={true} />);

      expect(
        screen.getByRole("img", { name: NOT_YET_SAVED_LABEL }),
      ).not.toHaveAttribute("data-recently-saved");
    });
  });

  describe("after a successful write", () => {
    it("shows persistence only once the write succeeded", () => {
      render(<SessionPersistenceIndicator recentlySaved={false} />);
      expect(
        screen.queryByRole("img", { name: SAVED_LABEL }),
      ).not.toBeInTheDocument();

      autosaveSession();

      expect(
        screen.getByRole("img", { name: SAVED_LABEL }),
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("carries a native title so mouse users get the same text on hover", () => {
      render(<SessionPersistenceIndicator recentlySaved={false} />);
      autosaveSession();

      expect(screen.getByRole("img", { name: SAVED_LABEL })).toHaveAttribute(
        "title",
        SAVED_LABEL,
      );
    });

    it("does not set data-recently-saved when recentlySaved is false", () => {
      render(<SessionPersistenceIndicator recentlySaved={false} />);
      autosaveSession();

      expect(
        screen.getByRole("img", { name: SAVED_LABEL }),
      ).not.toHaveAttribute("data-recently-saved");
    });

    it("sets data-recently-saved when recentlySaved is true", () => {
      render(<SessionPersistenceIndicator recentlySaved={true} />);
      autosaveSession();

      expect(screen.getByRole("img", { name: SAVED_LABEL })).toHaveAttribute(
        "data-recently-saved",
        "true",
      );
    });
  });

  describe("when storage is blocked or throwing", () => {
    it("reports persistence unavailable when site data is blocked", () => {
      blockSiteData();
      render(<SessionPersistenceIndicator recentlySaved={false} />);

      autosaveSession();

      expect(
        screen.getByRole("img", { name: NOT_SAVED_LABEL }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("img", { name: SAVED_LABEL }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(UNAVAILABLE_MESSAGE);
    });

    it.each(["SecurityError", "QuotaExceededError"])(
      "reports persistence unavailable when setItem throws %s",
      (errorName) => {
        const storage = createStorage();
        storage.failWith = errorName;
        installLocalStorage(storage);
        render(<SessionPersistenceIndicator recentlySaved={false} />);

        autosaveSession();

        expect(
          screen.getByRole("img", { name: NOT_SAVED_LABEL }),
        ).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent(
          UNAVAILABLE_MESSAGE,
        );
      },
    );

    it("flips to unavailable when a later write throws", () => {
      const storage = createStorage();
      installLocalStorage(storage);
      render(<SessionPersistenceIndicator recentlySaved={false} />);

      autosaveSession();
      expect(
        screen.getByRole("img", { name: SAVED_LABEL }),
      ).toBeInTheDocument();

      storage.failWith = "QuotaExceededError";
      autosaveSession();

      expect(
        screen.queryByRole("img", { name: SAVED_LABEL }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(UNAVAILABLE_MESSAGE);
    });

    it("never pulses the saved state while unavailable", () => {
      blockSiteData();
      render(<SessionPersistenceIndicator recentlySaved={true} />);

      autosaveSession();

      expect(
        screen.getByRole("img", { name: NOT_SAVED_LABEL }),
      ).not.toHaveAttribute("data-recently-saved");
    });
  });

  describe("accessibility", () => {
    it("keeps a polite live region mounted so the message is announced", () => {
      render(<SessionPersistenceIndicator recentlySaved={false} />);

      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
      expect(status).toBeEmptyDOMElement();

      blockSiteData();
      autosaveSession();

      expect(screen.getByRole("status")).toBe(status);
      expect(status).toHaveTextContent(UNAVAILABLE_MESSAGE);
    });
  });
});
