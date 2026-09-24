import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_CONTEXT_CHANNEL,
  subscribeToAccountContext,
  type AccountContextMessage,
} from "../accountContextSync";

const message: AccountContextMessage = {
  type: "account-context",
  address: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
  network: "TESTNET",
  connected: true,
  changedAt: 1,
  source: "tab-a",
};

describe("account context cross-tab transport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("propagates account changes between isolated channel instances", () => {
    const channels: Array<{
      name: string;
      onmessage: ((event: MessageEvent<unknown>) => void) | null;
    }> = [];
    class FakeBroadcastChannel {
      onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
      constructor(readonly name: string) {
        channels.push(this);
      }
      postMessage(data: AccountContextMessage) {
        channels
          .filter((channel) => channel !== this && channel.name === this.name)
          .forEach((channel) => channel.onmessage?.({ data } as MessageEvent));
      }
      close() {}
    }
    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);

    const received = vi.fn();
    const tabA = subscribeToAccountContext(vi.fn());
    const tabB = subscribeToAccountContext(received);
    tabA.publish(message);

    expect(channels).toHaveLength(2);
    expect(channels[0]?.name).toBe(ACCOUNT_CONTEXT_CHANNEL);
    expect(received).toHaveBeenCalledWith(message);
    tabA.close();
    tabB.close();
  });

  it("is a no-op when BroadcastChannel is unavailable", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    const subscription = subscribeToAccountContext(vi.fn());
    expect(() => subscription.publish(message)).not.toThrow();
    expect(() => subscription.close()).not.toThrow();
  });
});
