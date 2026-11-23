import { expect, test, type Page } from "@playwright/test";

const MOCK_ADDRESS = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";

// Vite injects an inline React preamble in dev that the production CSP blocks.
// CSP itself is covered separately; this browser flow needs the app to boot.
test.use({ bypassCSP: true });

// Replace the external wallet extension only. The page, motion preference,
// connection modal, routing, and stream views all run in the real browser.
async function rejectOnceThenConnect(page: Page) {
  await page.addInitScript(
    ({ address }) => {
      (window as unknown as { freighter: boolean }).freighter = true;
      let accessAttempts = 0;
      let connected = false;

      window.addEventListener("message", (event: MessageEvent) => {
        const data = event.data;
        if (
          !data ||
          data.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST" ||
          event.source !== window
        ) {
          return;
        }

        const base = {
          source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
          messagedId: data.messageId,
          error: "",
        };
        let payload: Record<string, unknown> = {};

        switch (data.type) {
          case "REQUEST_CONNECTION_STATUS":
            payload = { isConnected: true };
            break;
          case "REQUEST_ALLOWED_STATUS":
          case "SET_ALLOWED_STATUS":
            payload = { isAllowed: true };
            break;
          case "REQUEST_ACCESS":
            accessAttempts += 1;
            if (accessAttempts === 1) {
              window.postMessage(
                {
                  ...base,
                  error: "User rejected the connection request",
                  apiData: { error: "User rejected the connection request" },
                },
                window.location.origin,
              );
              return;
            }
            connected = true;
            payload = { publicKey: address, address };
            break;
          case "REQUEST_PUBLIC_KEY":
          case "REQUEST_USER_INFO":
            payload = connected
              ? { publicKey: address, address }
              : { publicKey: "", address: "" };
            break;
          case "REQUEST_NETWORK":
          case "REQUEST_NETWORK_DETAILS":
            payload = {
              network: "TESTNET",
              networkPassphrase: "Test SDF Network ; September 2015",
              networkUrl: "https://horizon-testnet.stellar.org",
              networkDetails: {
                network: "TESTNET",
                networkPassphrase: "Test SDF Network ; September 2015",
                networkUrl: "https://horizon-testnet.stellar.org",
              },
            };
            break;
        }

        window.postMessage(
          { ...base, ...payload, apiData: payload },
          window.location.origin,
        );
      });
    },
    { address: MOCK_ADDRESS },
  );
}

test("reduced-motion wallet connection recovers from a rejected request", async ({
  page,
}) => {
  await rejectOnceThenConnect(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Connect your wallet" }),
  ).toBeVisible();
  const decorativeDot = page
    .locator(
      'main[aria-labelledby="connect-wallet-heading"] > div[aria-hidden="true"]',
    )
    .first();
  await expect(decorativeDot).not.toHaveCSS("box-shadow", "none");

  // Changing the OS preference while the page is open must stop the glow.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(decorativeDot).toHaveCSS("box-shadow", "none");

  await page.getByRole("button", { name: "Connect wallet" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCSS("animation-name", "none");
  await dialog
    .getByRole("listitem", { name: /connect with freighter/i })
    .click();

  // A declined permission request remains recoverable with motion reduced.
  await expect(
    dialog.getByRole("heading", { name: "Connection Rejected" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/connect-wallet$/);
  await dialog
    .getByRole("button", { name: /retry connecting to freighter/i })
    .click();

  await expect(page).toHaveURL(/\/app\/streams$/);
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /open wallet options/i }),
  ).toBeVisible();
});
