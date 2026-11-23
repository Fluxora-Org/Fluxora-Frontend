import { describe, expect, it, vi } from "vitest";
import {
  checkApiVersion,
  isSupportedApiVersion,
} from "../apiVersion";

describe("apiVersion", () => {
  it("accepts v1 patch and minor versions", () => {
    expect(isSupportedApiVersion("1")).toBe(true);
    expect(isSupportedApiVersion("1.2.3")).toBe(true);
    expect(isSupportedApiVersion("2.0.0")).toBe(false);
  });

  it("recognizes a compatible JSON version response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: "1.4.0" }), { status: 200 }),
    );
    await expect(checkApiVersion("https://api.example.test/", fetchImpl)).resolves.toEqual({
      status: "compatible",
      version: "1.4.0",
    });
    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.test/version", {
      headers: { Accept: "application/json" },
    });
  });

  it("rejects an unknown major version", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: "2.0.0" }), { status: 200 }),
    );
    await expect(checkApiVersion("https://api.example.test", fetchImpl)).resolves.toEqual({
      status: "incompatible",
      version: "2.0.0",
    });
  });

  it("does not turn a transient outage into an update warning", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(checkApiVersion("https://api.example.test", fetchImpl)).resolves.toEqual({
      status: "unavailable",
    });
  });
});
