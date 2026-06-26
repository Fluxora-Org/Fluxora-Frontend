# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recipient.spec.ts >> shows recipient withdraw state and incoming streams
- Location: e2e/recipient.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Your streams' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Your streams' })

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
  3  | test("shows recipient withdraw state and incoming streams", async ({ page }) => {
  4  |   await page.goto("/app/recipient", { waitUntil: "domcontentloaded" });
  5  | 
> 6  |   await expect(page.getByRole("heading", { name: "Your streams" })).toBeVisible();
     |                                                                     ^ Error: expect(locator).toBeVisible() failed
  7  |   await expect(
  8  |     page.getByRole("button", { name: "Withdraw 22,600 USDC" }),
  9  |   ).toBeEnabled();
  10 |   await expect(page.getByText("Withdrawable now")).toBeVisible();
  11 |   await expect(
  12 |     page.getByRole("heading", { name: "Incoming streams", exact: true }),
  13 |   ).toBeVisible();
  14 | });
  15 | 
```