# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: create-stream.spec.ts >> creates a stream through the three-step wizard
- Location: e2e/create-stream.spec.ts:6:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Streams' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Streams' })

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner "Global navigation":
  - link "Fluxora home":
    - /url: /
    - text: Fluxora
  - navigation "Marketing navigation":
    - link "Features":
      - /url: /#features
    - link "Docs":
      - /url: /#docs
    - link "Pricing":
      - /url: /#pricing
  - button "Switch to dark mode"
  - link "Connect your Stellar wallet":
    - /url: /connect-wallet
    - text: Connect Wallet
- main "Connect your wallet":
  - img
  - text: Get started
  - heading "Connect your wallet" [level=1]
  - paragraph: Connect a Stellar wallet to manage treasury streams, track balances, and withdraw safely. Fluxora never asks for your private keys.
  - list "Wallet onboarding checklist":
    - listitem: Choose a wallet provider
    - listitem: Approve the connection request
    - listitem: Return to Fluxora to continue
  - button "Connect wallet"
  - paragraph: Having trouble connecting? Make sure your wallet extension is installed and unlocked.
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | const validStellarAddress =
  4  |   "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  5  | 
  6  | test("creates a stream through the three-step wizard", async ({ page }) => {
  7  |   await page.goto("/app/streams", { waitUntil: "domcontentloaded" });
  8  | 
> 9  |   await expect(page.getByRole("heading", { name: "Streams" })).toBeVisible();
     |                                                                ^ Error: expect(locator).toBeVisible() failed
  10 |   await page.getByRole("button", { name: "Create stream" }).click();
  11 | 
  12 |   const dialog = page.getByRole("dialog", { name: "Create stream" });
  13 |   await expect(dialog).toBeVisible();
  14 | 
  15 |   await dialog
  16 |     .getByRole("textbox", { name: "Recipient" })
  17 |     .fill(validStellarAddress);
  18 |   await dialog.getByRole("textbox", { name: "Deposit amount" }).fill("120");
  19 |   await dialog.getByRole("button", { name: "Next" }).click();
  20 | 
  21 |   await expect(
  22 |     dialog.getByRole("heading", { name: "Rate & schedule" }),
  23 |   ).toBeVisible();
  24 |   await dialog.locator("#create-stream-accrual-rate").fill("30");
  25 |   await dialog.locator("#create-stream-duration").fill("4");
  26 |   await dialog.getByRole("button", { name: "Next" }).click();
  27 | 
  28 |   await expect(dialog.getByText("120.00 USDC", { exact: true })).toBeVisible();
  29 |   await expect(dialog.getByText("30 USDC per month")).toBeVisible();
  30 |   await dialog
  31 |     .getByRole("button", { name: "Create stream", exact: true })
  32 |     .click();
  33 | 
  34 |   const successDialog = page.getByRole("dialog", { name: /stream created/i });
  35 |   await expect(successDialog).toBeVisible();
  36 |   await expect(
  37 |     successDialog.getByText("#STR-005", { exact: true }),
  38 |   ).toBeVisible();
  39 | });
  40 | 
```