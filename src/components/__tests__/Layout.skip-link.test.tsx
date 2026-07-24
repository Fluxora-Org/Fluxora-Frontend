import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import Layout from "../Layout";

/**
 * The skip link is the WCAG 2.4.1 bypass-block mechanism for the app shell.
 * In real browsers, activating the skip link moves focus onto the matching
 * `#main-content` element via native fragment navigation, which jsdom does
 * NOT replicate (see https://github.com/jsdom/jsdom/issues/4159). Layout's
 * `handleSkipLinkClick` works around this by imperatively calling
 * `main.focus()` on click, so we can verify both the underlying
 * *configuration* (href, target id, tabIndex=-1, tab order) and the resulting
 * focus transfer.
 */
test("skip link is configured for WCAG 2.4.1 bypass-block and is first in tab order", async () => {
  render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>,
  );

  // 1. Skip link is present in the DOM with a stable accessible name and an
  //    href that anchors to the main element.
  const skipLink = screen.getByRole("link", { name: /skip to main content/i });
  expect(skipLink).toBeInTheDocument();
  expect(skipLink).toHaveAttribute("href", "#main-content");

  // 2. The matched target is programmatically focusable (so real browsers
  //    move focus to it when the skip link is activated). The combination of
  //    the matching id and tabIndex={-1} is what makes this work in jsdom-free
  //    environments; the run-time focus behaviour itself is verified by
  //    axe-core and Playwright in the e2e suite.
  const main = screen.getByRole("main");
  expect(main).toHaveAttribute("id", "main-content");
  expect(main).toHaveAttribute("tabindex", "-1");

  // 3. Tab order: the first focusable element is the skip link (verified by
  //    userEvent.tab() which dispatches a real key event).
  document.body.focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(skipLink);

  // 4. Activating the link triggers handleSkipLinkClick, which moves focus
  //    to #main-content directly (bypassing jsdom's lack of fragment nav).
  await userEvent.click(skipLink);
  expect(document.activeElement).toBe(main);
});
