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
    it("traps Tab and Shift+Tab focus navigation within container when trapFocus is enabled", () => {
      const container = document.createElement("div");
      const btn1 = document.createElement("button");
      const btn2 = document.createElement("button");
      container.appendChild(btn1);
      container.appendChild(btn2);
      document.body.appendChild(container);

      const cleanup = setupEmbedFocusManagement(container, { trapFocus: true });

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

    it("handles case where no close button exists when Escape is pressed", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);

      const cleanup = setupEmbedFocusManagement(container);

      const escEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      expect(() => container.dispatchEvent(escEvent)).not.toThrow();

      cleanup();
    });

    it("does not cycle focus on Tab keypress when activeElement is not an edge element (trapFocus enabled)", () => {
      const container = document.createElement("div");
      const btn1 = document.createElement("button");
      const btn2 = document.createElement("button");
      const btn3 = document.createElement("button");
      container.appendChild(btn1);
      container.appendChild(btn2);
      container.appendChild(btn3);
      document.body.appendChild(container);

      const cleanup = setupEmbedFocusManagement(container, { trapFocus: true });

      btn2.focus();

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: false,
        bubbles: true,
      });
      const tabSpy = vi.spyOn(tabEvent, "preventDefault");
      container.dispatchEvent(tabEvent);

      expect(tabSpy).not.toHaveBeenCalled();

      const shiftTabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
      });
      const shiftTabSpy = vi.spyOn(shiftTabEvent, "preventDefault");
      container.dispatchEvent(shiftTabEvent);

      expect(shiftTabSpy).not.toHaveBeenCalled();

      cleanup();
    });

    it("ignores non-Tab and non-Escape key events", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);

      const cleanup = setupEmbedFocusManagement(container);

      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      const spy = vi.spyOn(enterEvent, "preventDefault");
      container.dispatchEvent(enterEvent);

      expect(spy).not.toHaveBeenCalled();

      cleanup();
    });

    it("leaves edge Tab keypresses to the browser by default (focus can exit to the host page)", () => {
      const container = document.createElement("div");
      const btn1 = document.createElement("button");
      const btn2 = document.createElement("button");
      container.appendChild(btn1);
      container.appendChild(btn2);
      document.body.appendChild(container);

      const cleanup = setupEmbedFocusManagement(container);

      // Tab from the last element: default (non-trapping) behaviour must not
      // intercept the keypress, so the browser moves focus out of the widget.
      btn2.focus();
      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: false,
        bubbles: true,
      });
      const tabSpy = vi.spyOn(tabEvent, "preventDefault");
      container.dispatchEvent(tabEvent);

      expect(tabSpy).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(btn2);

      // Shift+Tab from the first element is likewise left to the browser.
      btn1.focus();
      const shiftTabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
      });
      const shiftTabSpy = vi.spyOn(shiftTabEvent, "preventDefault");
      container.dispatchEvent(shiftTabEvent);

      expect(shiftTabSpy).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(btn1);

      cleanup();
    });

    it("calls onEscape when Escape is pressed and no close control exists", () => {
      const container = document.createElement("div");
      const btn = document.createElement("button");
      container.appendChild(btn);
      document.body.appendChild(container);

      const onEscape = vi.fn();
      const cleanup = setupEmbedFocusManagement(container, { onEscape });

      const escEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      container.dispatchEvent(escEvent);

      expect(onEscape).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it("activates a close control instead of onEscape when one exists", () => {
      const container = document.createElement("div");
      const closeBtn = document.createElement("button");
      closeBtn.setAttribute("data-close", "");
      const clickSpy = vi.fn();
      closeBtn.addEventListener("click", clickSpy);
      container.appendChild(closeBtn);
      document.body.appendChild(container);

      const onEscape = vi.fn();
      const cleanup = setupEmbedFocusManagement(container, { onEscape });

      const escEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      container.dispatchEvent(escEvent);

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(onEscape).not.toHaveBeenCalled();

      cleanup();
    });
  });

  describe("focus entry/exit contract", () => {
    it("restores focus to the previously focused element on unmount", () => {
      const origin = document.createElement("button");
      origin.textContent = "Open widget";
      document.body.appendChild(origin);

      const article = document.createElement("div");
      article.setAttribute("role", "article");
      document.body.appendChild(article);

      origin.focus();
      expect(document.activeElement).toBe(origin);

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "Widget Title", isMainContent: true })
      );

      // Focus entry: focus moves into the widget container.
      expect(article.getAttribute("tabindex")).toBe("-1");
      expect(document.activeElement).toBe(article);

      unmount();

      // Focus restoration: focus returns to the element that owned it before.
      expect(document.activeElement).toBe(origin);
    });

    it("does not restore focus to a non-focusable body origin on unmount", () => {
      const article = document.createElement("div");
      article.setAttribute("role", "article");
      document.body.appendChild(article);

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "Widget Title", isMainContent: true })
      );

      expect(document.activeElement).toBe(article);
      unmount();

      expect(article.hasAttribute("tabindex")).toBe(false);
    });

    it("does not move or restore focus when isMainContent is false", () => {
      const origin = document.createElement("button");
      document.body.appendChild(origin);

      const article = document.createElement("div");
      article.setAttribute("role", "article");
      document.body.appendChild(article);

      origin.focus();

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "Widget Title", isMainContent: false })
      );

      expect(article.hasAttribute("tabindex")).toBe(false);
      expect(document.activeElement).toBe(origin);

      unmount();

      expect(document.activeElement).toBe(origin);
    });

    it("Escape restores focus to the focus origin when focus is inside the widget", () => {
      const origin = document.createElement("button");
      document.body.appendChild(origin);

      const article = document.createElement("div");
      article.setAttribute("role", "article");
      document.body.appendChild(article);

      origin.focus();

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "Widget Title", isMainContent: true })
      );

      expect(document.activeElement).toBe(article);

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );

      expect(document.activeElement).toBe(origin);

      unmount();
    });

    it("Escape refocuses the container and announces exit guidance when there is no same-document origin", () => {
      const article = document.createElement("div");
      article.setAttribute("role", "article");
      document.body.appendChild(article);

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "Widget Title", isMainContent: true })
      );

      // In an iframe-like context nothing meaningful had focus before the
      // widget, so the container is focused on entry.
      expect(document.activeElement).toBe(article);

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );

      // Focus stays on the container and exit guidance is announced.
      expect(document.activeElement).toBe(article);
      const announcer = document.querySelector('[aria-live="polite"]');
      expect(announcer?.textContent).toContain(
        "Press Tab to return to the host page"
      );

      unmount();
    });

    it("Escape activates a close button when one exists inside the widget", () => {
      const article = document.createElement("div");
      article.setAttribute("role", "article");
      document.body.appendChild(article);

      const closeBtn = document.createElement("button");
      closeBtn.setAttribute("aria-label", "Close widget");
      const clickSpy = vi.fn();
      closeBtn.addEventListener("click", clickSpy);
      article.appendChild(closeBtn);

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "Widget Title", isMainContent: true })
      );

      closeBtn.focus();

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );

      expect(clickSpy).toHaveBeenCalledTimes(1);

      unmount();
    });

    it("Escape is ignored while a dialog is open", () => {
      const origin = document.createElement("button");
      document.body.appendChild(origin);

      const article = document.createElement("div");
      article.setAttribute("role", "article");
      document.body.appendChild(article);

      const dialog = document.createElement("div");
      dialog.setAttribute("role", "dialog");
      document.body.appendChild(dialog);

      origin.focus();

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "Widget Title", isMainContent: true })
      );

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );

      // The open dialog owns Escape: the widget must not restore focus.
      expect(document.activeElement).toBe(article);

      unmount();
    });

    it("Escape is ignored when focus is outside the widget", () => {
      const origin = document.createElement("button");
      document.body.appendChild(origin);

      const article = document.createElement("div");
      article.setAttribute("role", "article");
      document.body.appendChild(article);

      origin.focus();

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "Widget Title", isMainContent: true })
      );

      // User moves focus back out to the host page.
      origin.focus();

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );

      // Escape outside the widget must never be hijacked.
      expect(document.activeElement).toBe(origin);

      unmount();
    });

    it("non-Escape keys do not trigger exit behaviour", () => {
      const article = document.createElement("div");
      article.setAttribute("role", "article");
      document.body.appendChild(article);

      const closeBtn = document.createElement("button");
      closeBtn.setAttribute("aria-label", "Close widget");
      const clickSpy = vi.fn();
      closeBtn.addEventListener("click", clickSpy);
      article.appendChild(closeBtn);

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "Widget Title", isMainContent: true })
      );

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );

      expect(clickSpy).not.toHaveBeenCalled();

      unmount();
    });
  });

  describe("edge cases", () => {
    it("handles case where no widget container exists in DOM", () => {
      document.body.innerHTML = "";
      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "No Container" })
      );
      // Escape with no widget container is a safe no-op.
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      expect(() => unmount()).not.toThrow();
    });

    it("handles a null focus origin at mount without crashing", () => {
      const article = document.createElement("div");
      article.setAttribute("role", "article");
      document.body.appendChild(article);

      // Simulate a browsing context where no element holds focus when the
      // widget mounts (e.g. a freshly loaded iframe document).
      const activeElementSpy = vi
        .spyOn(document, "activeElement", "get")
        .mockReturnValue(null);

      const { unmount } = renderHook(() =>
        useEmbedAccessibility({ title: "Widget Title", isMainContent: true })
      );
      activeElementSpy.mockRestore();

      // Focus entry still works when there is no focus origin to restore.
      expect(document.activeElement).toBe(article);

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );

      // No origin to restore: focus stays on the container.
      expect(document.activeElement).toBe(article);

      expect(() => unmount()).not.toThrow();
    });

    it("createAccessibleWidgetContainer handles options without specific attributes", () => {
      const el = document.createElement("div");
      document.body.appendChild(el);

      const cleanup = createAccessibleWidgetContainer(el);

      expect(el.getAttribute("role")).toBe("article");

      cleanup();

      expect(el.hasAttribute("role")).toBe(false);
    });

    it("announceToScreenReader returns noop cleanup when container evaluates to null", () => {
      const spy = vi.spyOn(document, "body", "get").mockReturnValue(null as unknown as HTMLElement);
      const cleanup = announceToScreenReader("test", "polite", { container: null });
      expect(typeof cleanup).toBe("function");
      expect(cleanup()).toBeUndefined();
      spy.mockRestore();
    });
  });
});
