import { expect, test } from "@playwright/test";

const searchName = "Search streams by name, ID or recipient";
const account = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

test.beforeEach(async ({ page }) => {
  // Stub the wallet API at its browser module boundary, without a real extension.
  await page.route(
    /\/node_modules\/\.vite\/deps\/@stellar_freighter-api\.js/,
    async (route) => {
      await route.fulfill({
        contentType: "application/javascript",
        body: `
      export const isConnected = async () => ({ isConnected: true });
      export const isAllowed = async () => ({ isAllowed: true });
      export const getAddress = async () => ({ address: "${account}" });
      export const requestAccess = getAddress;
      export const getNetwork = async () => ({ network: "TESTNET" });
      export const signTransaction = async () => { throw new Error("Signing is outside this test"); };
      export class WatchWalletChanges { watch() {} stop() {} }
      export default { isConnected, isAllowed, getAddress, requestAccess, getNetwork, signTransaction, WatchWalletChanges };
    `,
      });
    },
  );
});

test("search survives reload and saved views create, apply, and delete", async ({
  page,
}) => {
  await page.goto("/app/streams?q=str-001");
  const list = page.getByRole("list", { name: "Stream cards" });
  await expect(list.getByRole("heading", { level: 3 })).toHaveText([
    "Dev Grant - Alice",
  ]);
  await page.getByLabel("View name", { exact: true }).fill("Payroll");
  await page.getByRole("button", { name: "Save current view" }).click();
  await expect(
    page.getByRole("button", { name: "Apply view Payroll" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: searchName }).fill("no such stream");
  await expect(page).toHaveURL(/q=no(%20|\+)such(%20|\+)stream/);
  await page.getByRole("button", { name: "Apply view Payroll" }).click();
  await expect(page).toHaveURL(/q=str-001/);
  await expect(list.getByRole("heading", { level: 3 })).toHaveText([
    "Dev Grant - Alice",
  ]);
  await page.reload();
  await expect(page.getByRole("textbox", { name: searchName })).toHaveValue(
    "str-001",
  );
  await expect(
    page.getByRole("button", { name: "Apply view Payroll" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete view Payroll" }).click();
  await expect(
    page.getByRole("button", { name: "Apply view Payroll" }),
  ).toHaveCount(0);
});

test("matches an address suffix case-insensitively and treats regex input literally", async ({
  page,
}) => {
  await page.goto("/app/streams?q=icca3p");
  const list = page.getByRole("list", { name: "Stream cards" });
  await expect(list.getByRole("heading", { level: 3 })).toHaveText([
    "Dev Grant - Alice",
  ]);
  await page.getByRole("textbox", { name: searchName }).fill(".*");
  await expect(list.getByRole("heading", { level: 3 })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(list.getByRole("heading", { level: 3 })).toHaveCount(4);
});

test("preserves the query through detail navigation, reload, and return to the list", async ({ page }) => {
  await page.goto("/app/streams?q=str-001");
  await page.getByRole("button", { name: "Open detail", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/streams\/STR-001\?q=str-001/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Dev Grant - Alice" })).toBeVisible();
  await page.getByTestId("stream-detail-page").getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Streams", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/streams\?q=str-001/);
  await expect(page.getByRole("textbox", { name: searchName })).toHaveValue("str-001");
  await expect(page.getByRole("list", { name: "Stream cards" }).getByRole("heading", { level: 3 })).toHaveText(["Dev Grant - Alice"]);
});
