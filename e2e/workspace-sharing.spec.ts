import { expect, test } from "@playwright/test";

const validStellarAddress =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

async function createStream(
  page: import("@playwright/test").Page,
  path = "/app/streams",
) {
  await page.goto(path, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Streams" })).toBeVisible();
  await page.getByRole("button", { name: "Create stream" }).click();

  const dialog = page.getByRole("dialog", { name: "Create stream" });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Recipient" })
    .fill(validStellarAddress);
  await dialog.getByRole("textbox", { name: "Deposit amount" }).fill("120");
  await dialog.getByRole("button", { name: "Next" }).click();

  await expect(
    dialog.getByRole("heading", { name: "Rate & schedule" }),
  ).toBeVisible();
  await dialog.locator("#create-stream-accrual-rate").fill("30");
  await dialog.locator("#create-stream-duration").fill("4");
  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.getByRole("button", { name: "Create stream", exact: true }).click();

  const successDialog = page.getByRole("dialog", { name: /stream created/i });
  await expect(successDialog).toBeVisible();
  return successDialog;
}

async function openSlackChannel(successDialog: import("@playwright/test").Locator) {
  await successDialog.getByRole("button", { name: "Share to Slack" }).click();
  await successDialog
    .getByRole("button", { name: "Connect Slack" })
    .click();

  const channel = successDialog.getByRole("combobox", { name: "Channel" });
  await expect(channel).toBeVisible();
  await channel.fill("payroll");
  await successDialog.getByRole("option", { name: "#payroll" }).click();
}

test("workspace sharing succeeds through Slack", async ({ page }) => {
  const successDialog = await createStream(page);
  await openSlackChannel(successDialog);

  await successDialog.getByRole("button", { name: "Send to channel" }).click();
  await expect(successDialog.getByText("Sent", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Stream summary shared to payroll on Slack.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("workspace sharing reports a send failure and allows retry", async ({
  page,
}) => {
  const successDialog = await createStream(
    page,
    "/app/streams?e2e-share-failure",
  );
  await openSlackChannel(successDialog);

  await successDialog
    .getByRole("button", { name: "Send to channel" })
    .click();
  await expect(
    successDialog.getByRole("alert", {
      name: "Could not post to the selected channel. Check the connection and try again.",
    }),
  ).toBeVisible();
  await expect(
    successDialog.getByRole("button", { name: "Retry send" }),
  ).toBeVisible();
});