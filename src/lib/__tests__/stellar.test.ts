import { describe, expect, it } from "vitest";
import { stellarExplorerUrl } from "../stellar";

describe("stellarExplorerUrl", () => {
  it.each([
    ["PUBLIC", "public"],
    ["MAINNET", "public"],
    ["TESTNET", "testnet"],
    [null, "testnet"],
  ])("maps %s to the %s explorer path", (network, expectedPath) => {
    expect(stellarExplorerUrl("GABC", network)).toBe(
      `https://stellar.expert/explorer/${expectedPath}/account/GABC`,
    );
  });

  it("encodes the account path segment", () => {
    expect(stellarExplorerUrl("GABC/unsafe value", "PUBLIC")).toBe(
      "https://stellar.expert/explorer/public/account/GABC%2Funsafe%20value",
    );
  });
});
