import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  useEmbedAccessibility,
  createAccessibleWidgetContainer,
  announceToScreenReader,
  setupEmbedFocusManagement,
} from "../useEmbedAccessibility";

describe("useEmbedAccessibility hook", () => {
  let originalTitle: string;
  let originalLang: string | null;

  beforeEach(() => {
    vi.useFakeTimers();
    originalTitle = document.title;
    originalLang = document.documentElement.getAttribute("lang");

    const existingMeta = document.querySelector('meta[name="description"]');
    if (existingMeta) {
      existingMeta.remove();
    }
  });

  afterEach(() => {
    document.title = originalTitle;
    if (originalLang !== null) {
      document.documentElement.setAttribute("lang", originalLang);
    } else {
      document.documentElement.removeAttribute("lang");
    }
    const existingMeta = document.querySelector('meta[name="description"]');
    if (existingMeta) {
      existingMeta.remove();
    }
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("document.title lifecycle", () => {
    it("saves initial title on mount and restores it on unmount", () => {
      document.title = "Initial Page Title";
      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "Treasury Stream" })
      );

      expect(document.title).toBe("Treasury Stream - Fluxora Widget");

      unmount();

      expect(document.title).toBe("Initial Page Title");
    });
  });

  describe("meta[name='description'] lifecycle", () => {
    it("creates meta element when absent on mount and removes it on unmount", () => {
      expect(document.querySelector('meta[name="description"]')).toBeNull();

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({
          title: "Widget Title",
          description: "Widget Description Meta",
        })
      );

      const meta = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
      );
      expect(meta).not.toBeNull();
      expect(meta?.getAttribute("content")).toBe("Widget Description Meta");

      unmount();

      expect(document.querySelector('meta[name="description"]')).toBeNull();
    });

    it("restores original meta content on unmount when meta tag existed prior to mount", () => {
      const preExistingMeta = document.createElement("meta");
      preExistingMeta.name = "description";
      preExistingMeta.setAttribute("content", "Original site description");
      document.head.appendChild(preExistingMeta);

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({
          title: "Widget Title",
          description: "Widget Override Description",
        })
      );

      const meta = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
      );
      expect(meta?.getAttribute("content")).toBe("Widget Override Description");

      unmount();

      const restoredMeta = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
      );
      expect(restoredMeta).not.toBeNull();
      expect(restoredMeta?.getAttribute("content")).toBe(
        "Original site description"
      );
    });

    it("does not mutate or touch meta tag if description is undefined", () => {
      const preExistingMeta = document.createElement("meta");
      preExistingMeta.name = "description";
      preExistingMeta.setAttribute("content", "Existing site description");
      document.head.appendChild(preExistingMeta);

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({
          title: "Widget Title",
        })
      );

      const meta = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
      );
      expect(meta?.getAttribute("content")).toBe("Existing site description");

      unmount();

      expect(meta?.getAttribute("content")).toBe("Existing site description");
    });
  });

  describe("lang attribute lifecycle", () => {
    it("sets lang attribute from locale prop (or default 'en') and restores pre-existing lang on unmount", () => {
      document.documentElement.setAttribute("lang", "fr");

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({
          title: "Widget Title",
          locale: "es",
        })
      );

      expect(document.documentElement.getAttribute("lang")).toBe("es");

      unmount();

      expect(document.documentElement.getAttribute("lang")).toBe("fr");
    });

    it("falls back to 'en' when lang attribute was absent before mount, and restores 'en' on unmount", () => {
      document.documentElement.removeAttribute("lang");

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({
          title: "Widget Title",
        })
      );

      expect(document.documentElement.getAttribute("lang")).toBe("en");

      unmount();

      expect(document.documentElement.getAttribute("lang")).toBe("en");
    });
  });

  describe("widget container focus & tabindex lifecycle", () => {
    it("applies tabindex='-1' and focus to main element when isMainContent is true, and removes tabindex on unmount", () => {
      const main = document.createElement("main");
      document.body.appendChild(main);

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({
          title: "Widget Title",
          isMainContent: true,
        })
      );

      expect(main.getAttribute("tabindex")).toBe("-1");
      expect(document.activeElement).toBe(main);

      unmount();

      expect(main.hasAttribute("tabindex")).toBe(false);
    });

    it("applies tabindex='-1' and focus to role='article' container when available", () => {
      const article = document.createElement("div");
      article.setAttribute("role", "article");
      document.body.appendChild(article);

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({
          title: "Widget Title",
          isMainContent: true,
        })
      );

      expect(article.getAttribute("tabindex")).toBe("-1");
      expect(document.activeElement).toBe(article);

      unmount();

      expect(article.hasAttribute("tabindex")).toBe(false);
    });

    it("does not set tabindex or focus when isMainContent is false", () => {
      const main = document.createElement("main");
      document.body.appendChild(main);

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({
          title: "Widget Title",
          isMainContent: false,
        })
      );

      expect(main.hasAttribute("tabindex")).toBe(false);
      expect(document.activeElement).not.toBe(main);

      unmount();

      expect(main.hasAttribute("tabindex")).toBe(false);
    });
  });

  describe("createAccessibleWidgetContainer helper", () => {
    it("applies accessibility attributes and restores original attributes on cleanup", () => {
      const el = document.createElement("div");
      el.setAttribute("role", "section");
      el.setAttribute("aria-label", "Old Label");
      el.setAttribute("aria-describedby", "old-desc");
      el.setAttribute("tabindex", "0");
      document.body.appendChild(el);

      const cleanup = createAccessibleWidgetContainer(el, {
        role: "article",
        ariaLabel: "New Label",
        ariaDescribedby: "new-desc",
        tabIndex: -1,
      });

      expect(el.getAttribute("role")).toBe("article");
      expect(el.getAttribute("aria-label")).toBe("New Label");
      expect(el.getAttribute("aria-describedby")).toBe("new-desc");
      expect(el.getAttribute("tabindex")).toBe("-1");

      el.focus();
      expect(el.style.outline).toBe(
        "2px solid var(--interactive-focus-ring, #007acc)"
      );

      el.blur();
      expect(el.style.outline).toBe("none");

      cleanup();

      expect(el.getAttribute("role")).toBe("section");
      expect(el.getAttribute("aria-label")).toBe("Old Label");
      expect(el.getAttribute("aria-describedby")).toBe("old-desc");
      expect(el.getAttribute("tabindex")).toBe("0");
    });

    it("removes applied attributes on cleanup if none existed originally", () => {
      const el = document.createElement("div");
      document.body.appendChild(el);

      const cleanup = createAccessibleWidgetContainer(el, {
        ariaLabel: "Added Label",
        ariaDescribedby: "added-desc",
        tabIndex: 0,
      });

      expect(el.getAttribute("role")).toBe("article");
      expect(el.getAttribute("aria-label")).toBe("Added Label");
      expect(el.getAttribute("aria-describedby")).toBe("added-desc");
      expect(el.getAttribute("tabindex")).toBe("0");

      cleanup();

      expect(el.hasAttribute("role")).toBe(false);
      expect(el.hasAttribute("aria-label")).toBe(false);
      expect(el.hasAttribute("aria-describedby")).toBe(false);
      expect(el.hasAttribute("tabindex")).toBe(false);
    });
  });

  describe("announceToScreenReader helper", () => {
    it("creates live region div, announces message, and clears after timeout", () => {
      const cleanup = announceToScreenReader("Test message", "assertive");

      const announcer = document.querySelector('[aria-live="assertive"]');
      expect(announcer).not.toBeNull();
      expect(announcer?.textContent).toBe("Test message");

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(announcer?.textContent).toBe("");

      cleanup();

      expect(document.querySelector('[aria-live="assertive"]')).toBeNull();
    });

    it("updates existing live region if announcer id exists", () => {
      const cleanup1 = announceToScreenReader("First message", "polite", {
        id: "custom-announcer",
      });

      const announcer = document.getElementById("custom-announcer");
      expect(announcer?.textContent).toBe("First message");

      const cleanup2 = announceToScreenReader("Second message", "assertive", {
        id: "custom-announcer",
      });

      expect(announcer?.textContent).toBe("Second message");
      expect(announcer?.getAttribute("aria-live")).toBe("assertive");

      cleanup1();
      cleanup2();
    });

    it("returns noop cleanup if container is null", () => {
      const cleanup = announceToScreenReader("Test", "polite", {
        container: null,
      });

      expect(typeof cleanup).toBe("function");
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe("setupEmbedFocusManagement helper", () => {
    it("traps Tab and Shift+Tab focus navigation within container", () => {
      const container = document.createElement("div");
      const btn1 = document.createElement("button");
      const btn2 = document.createElement("button");
      container.appendChild(btn1);
      container.appendChild(btn2);
      document.body.appendChild(container);

      const cleanup = setupEmbedFocusManagement(container);

      btn2.focus();
      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: false,
        bubbles: true,
      });
      const tabSpy = vi.spyOn(tabEvent, "preventDefault");
      container.dispatchEvent(tabEvent);

      expect(tabSpy).toHaveBeenCalled();
      expect(document.activeElement).toBe(btn1);

      btn1.focus();
      const shiftTabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
      });
      const shiftTabSpy = vi.spyOn(shiftTabEvent, "preventDefault");
      container.dispatchEvent(shiftTabEvent);

      expect(shiftTabSpy).toHaveBeenCalled();
      expect(document.activeElement).toBe(btn2);

      cleanup();
    });

    it("triggers close button click when Escape key is pressed", () => {
      const container = document.createElement("div");
      const closeBtn = document.createElement("button");
      closeBtn.setAttribute("aria-label", "Close modal");
      const clickSpy = vi.fn();
      closeBtn.addEventListener("click", clickSpy);
      container.appendChild(closeBtn);
      document.body.appendChild(container);

      const cleanup = setupEmbedFocusManagement(container);

      const escEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      container.dispatchEvent(escEvent);

      expect(clickSpy).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it("triggers data-close button click when Escape key is pressed", () => {
      const container = document.createElement("div");
      const closeBtn = document.createElement("button");
      closeBtn.setAttribute("data-close", "");
      const clickSpy = vi.fn();
      closeBtn.addEventListener("click", clickSpy);
      container.appendChild(closeBtn);
      document.body.appendChild(container);

      const cleanup = setupEmbedFocusManagement(container);

      const escEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      container.dispatchEvent(escEvent);

      expect(clickSpy).toHaveBeenCalledTimes(1);

      cleanup();
    });
  });
});
