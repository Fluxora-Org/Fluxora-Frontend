/**
 * Browser tests for iframe postMessage command validation (#1538).
 *
 * Tests nonce-based validation for embed commands including:
 * - Valid messages with proper nonce and timestamp
 * - Forged messages from untrusted origins
 * - Stale messages with expired timestamps
 * - Malformed messages with missing or invalid fields
 * - Replay attack protection
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseEmbedMessage,
  getAllowedEmbedOrigins,
  validateEmbedMessage,
  generateNonce,
  type EmbedMessage,
  type ValidationResult,
} from "../embedMessagePolicy";

describe("generateNonce", () => {
  it("generates a unique 32-character hex string", () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();
    
    expect(nonce1).toHaveLength(32);
    expect(nonce2).toHaveLength(32);
    expect(nonce1).toMatch(/^[0-9a-f]{32}$/);
    expect(nonce2).toMatch(/^[0-9a-f]{32}$/);
    expect(nonce1).not.toBe(nonce2);
  });
});

describe("parseEmbedMessage - schema validation", () => {
  it("accepts valid resize message with nonce and timestamp", () => {
    const nonce = generateNonce();
    const timestamp = Date.now();
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      height: 600,
      nonce,
      timestamp,
    };
    
    const result = parseEmbedMessage(message);
    expect(result).not.toBeNull();
    expect(result?.action).toBe("resize");
    expect(result?.width).toBe(800);
    expect(result?.height).toBe(600);
    expect(result?.nonce).toBe(nonce);
    expect(result?.timestamp).toBe(timestamp);
  });

  it("accepts valid theme message with nonce and timestamp", () => {
    const nonce = generateNonce();
    const timestamp = Date.now();
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "theme",
      theme: "dark",
      nonce,
      timestamp,
    };
    
    const result = parseEmbedMessage(message);
    expect(result).not.toBeNull();
    expect(result?.action).toBe("theme");
    expect(result?.theme).toBe("dark");
    expect(result?.nonce).toBe(nonce);
    expect(result?.timestamp).toBe(timestamp);
  });

  it("rejects message without nonce", () => {
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      timestamp: Date.now(),
    };
    
    const result = parseEmbedMessage(message);
    expect(result).toBeNull();
  });

  it("rejects message without timestamp", () => {
    const nonce = generateNonce();
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce,
    };
    
    const result = parseEmbedMessage(message);
    expect(result).toBeNull();
  });

  it("rejects message with invalid nonce type", () => {
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce: 123,
      timestamp: Date.now(),
    };
    
    const result = parseEmbedMessage(message);
    expect(result).toBeNull();
  });

  it("rejects message with invalid timestamp type", () => {
    const nonce = generateNonce();
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce,
      timestamp: "invalid",
    };
    
    const result = parseEmbedMessage(message);
    expect(result).toBeNull();
  });

  it("rejects message with infinite timestamp", () => {
    const nonce = generateNonce();
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce,
      timestamp: Infinity,
    };
    
    const result = parseEmbedMessage(message);
    expect(result).toBeNull();
  });

  it("rejects message with wrong type", () => {
    const nonce = generateNonce();
    const message = {
      type: "fluxora:malicious",
      version: 1,
      action: "resize",
      width: 800,
      nonce,
      timestamp: Date.now(),
    };
    
    const result = parseEmbedMessage(message);
    expect(result).toBeNull();
  });

  it("rejects message with wrong version", () => {
    const nonce = generateNonce();
    const message = {
      type: "fluxora:embed",
      version: 2,
      action: "resize",
      width: 800,
      nonce,
      timestamp: Date.now(),
    };
    
    const result = parseEmbedMessage(message);
    expect(result).toBeNull();
  });

  it("rejects message with invalid theme value", () => {
    const nonce = generateNonce();
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "theme",
      theme: "invalid",
      nonce,
      timestamp: Date.now(),
    };
    
    const result = parseEmbedMessage(message);
    expect(result).toBeNull();
  });

  it("rejects message with oversized dimensions", () => {
    const nonce = generateNonce();
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 5000,
      height: 600,
      nonce,
      timestamp: Date.now(),
    };
    
    const result = parseEmbedMessage(message);
    expect(result).toBeNull();
  });

  it("rejects non-object data", () => {
    const result = parseEmbedMessage("not an object");
    expect(result).toBeNull();
  });

  it("rejects array data", () => {
    const result = parseEmbedMessage([1, 2, 3]);
    expect(result).toBeNull();
  });

  it("rejects null data", () => {
    const result = parseEmbedMessage(null);
    expect(result).toBeNull();
  });
});

describe("parseEmbedMessage - replay protection", () => {
  it("rejects replayed message with same nonce", () => {
    const nonce = generateNonce();
    const timestamp = Date.now();
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce,
      timestamp,
    };
    
    // First call should succeed
    const result1 = parseEmbedMessage(message);
    expect(result1).not.toBeNull();
    
    // Second call with same nonce should fail
    const result2 = parseEmbedMessage(message);
    expect(result2).toBeNull();
  });

  it("accepts different nonces", () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();
    const timestamp = Date.now();
    
    const message1 = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce: nonce1,
      timestamp,
    };
    
    const message2 = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce: nonce2,
      timestamp,
    };
    
    const result1 = parseEmbedMessage(message1);
    const result2 = parseEmbedMessage(message2);
    
    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
  });
});

describe("parseEmbedMessage - timestamp freshness", () => {
  it("rejects stale message (too old)", () => {
    const nonce = generateNonce();
    const timestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce,
      timestamp,
    };
    
    const result = parseEmbedMessage(message);
    expect(result).toBeNull();
  });

  it("rejects future message (too far ahead)", () => {
    const nonce = generateNonce();
    const timestamp = Date.now() + 10 * 60 * 1000; // 10 minutes in future
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce,
      timestamp,
    };
    
    const result = parseEmbedMessage(message);
    expect(result).toBeNull();
  });

  it("accepts message with current timestamp", () => {
    const nonce = generateNonce();
    const timestamp = Date.now();
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce,
      timestamp,
    };
    
    const result = parseEmbedMessage(message);
    expect(result).not.toBeNull();
  });

  it("accepts message within TTL window", () => {
    const nonce = generateNonce();
    const timestamp = Date.now() - 4 * 60 * 1000; // 4 minutes ago (within 5 min TTL)
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce,
      timestamp,
    };
    
    const result = parseEmbedMessage(message);
    expect(result).not.toBeNull();
  });
});

describe("validateEmbedMessage - comprehensive validation", () => {
  it("validates message from trusted origin with correct source", () => {
    const allowedOrigins = new Set(["https://trusted-origin.com"]);
    const nonce = generateNonce();
    const timestamp = Date.now();
    
    const event = {
      source: window.parent,
      origin: "https://trusted-origin.com",
      data: {
        type: "fluxora:embed",
        version: 1,
        action: "resize",
        width: 800,
        nonce,
        timestamp,
      },
    } as MessageEvent;
    
    const result = validateEmbedMessage(event, allowedOrigins);
    expect(result.valid).toBe(true);
  });

  it("rejects message from untrusted origin", () => {
    const allowedOrigins = new Set(["https://trusted-origin.com"]);
    const nonce = generateNonce();
    const timestamp = Date.now();
    
    const event = {
      source: window.parent,
      origin: "https://malicious-origin.com",
      data: {
        type: "fluxora:embed",
        version: 1,
        action: "resize",
        width: 800,
        nonce,
        timestamp,
      },
    } as MessageEvent;
    
    const result = validateEmbedMessage(event, allowedOrigins);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("untrusted_origin");
    }
  });

  it("rejects message from null origin", () => {
    const allowedOrigins = new Set(["https://trusted-origin.com"]);
    const nonce = generateNonce();
    const timestamp = Date.now();
    
    const event = {
      source: window.parent,
      origin: "null",
      data: {
        type: "fluxora:embed",
        version: 1,
        action: "resize",
        width: 800,
        nonce,
        timestamp,
      },
    } as MessageEvent;
    
    const result = validateEmbedMessage(event, allowedOrigins);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("untrusted_origin");
    }
  });

  it("rejects message from wrong source window", () => {
    const allowedOrigins = new Set(["https://trusted-origin.com"]);
    const nonce = generateNonce();
    const timestamp = Date.now();
    
    const event = {
      source: { postMessage: () => {} }, // Not window.parent
      origin: "https://trusted-origin.com",
      data: {
        type: "fluxora:embed",
        version: 1,
        action: "resize",
        width: 800,
        nonce,
        timestamp,
      },
    } as MessageEvent;
    
    const result = validateEmbedMessage(event, allowedOrigins);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("invalid_source");
    }
  });

  it("rejects malformed message without nonce", () => {
    const allowedOrigins = new Set(["https://trusted-origin.com"]);
    
    const event = {
      source: window.parent,
      origin: "https://trusted-origin.com",
      data: {
        type: "fluxora:embed",
        version: 1,
        action: "resize",
        width: 800,
        timestamp: Date.now(),
      },
    } as MessageEvent;
    
    const result = validateEmbedMessage(event, allowedOrigins);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("missing_nonce");
    }
  });

  it("rejects stale message", () => {
    const allowedOrigins = new Set(["https://trusted-origin.com"]);
    const nonce = generateNonce();
    const timestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    
    const event = {
      source: window.parent,
      origin: "https://trusted-origin.com",
      data: {
        type: "fluxora:embed",
        version: 1,
        action: "resize",
        width: 800,
        nonce,
        timestamp,
      },
    } as MessageEvent;
    
    const result = validateEmbedMessage(event, allowedOrigins);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("stale_message");
    }
  });

  it("rejects replayed message", () => {
    const allowedOrigins = new Set(["https://trusted-origin.com"]);
    const nonce = generateNonce();
    const timestamp = Date.now();
    
    const message = {
      type: "fluxora:embed",
      version: 1,
      action: "resize",
      width: 800,
      nonce,
      timestamp,
    };
    
    // First validation
    const event1 = {
      source: window.parent,
      origin: "https://trusted-origin.com",
      data: message,
    } as MessageEvent;
    
    const result1 = validateEmbedMessage(event1, allowedOrigins);
    expect(result1.valid).toBe(true);
    
    // Second validation with same nonce (replay)
    const event2 = {
      source: window.parent,
      origin: "https://trusted-origin.com",
      data: message,
    } as MessageEvent;
    
    const result2 = validateEmbedMessage(event2, allowedOrigins);
    expect(result2.valid).toBe(false);
    if (!result2.valid) {
      expect(result2.reason).toBe("replay_attack");
    }
  });

  it("rejects message with invalid schema", () => {
    const allowedOrigins = new Set(["https://trusted-origin.com"]);
    
    const event = {
      source: window.parent,
      origin: "https://trusted-origin.com",
      data: "not a valid message",
    } as MessageEvent;
    
    const result = validateEmbedMessage(event, allowedOrigins);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("invalid_schema");
    }
  });

  it("does not expose payload contents in validation failure", () => {
    const allowedOrigins = new Set(["https://trusted-origin.com"]);
    
    const event = {
      source: window.parent,
      origin: "https://trusted-origin.com",
      data: {
        type: "fluxora:embed",
        version: 1,
        action: "resize",
        width: 800,
        sensitive: "secret data",
      },
    } as MessageEvent;
    
    const result = validateEmbedMessage(event, allowedOrigins);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      // The reason should not contain the sensitive data
      expect(result.reason).not.toContain("secret");
      expect(result.reason).toBe("missing_nonce");
    }
  });
});

describe("getAllowedEmbedOrigins", () => {
  it("includes window.location.origin when not in iframe", () => {
    const origins = getAllowedEmbedOrigins();
    expect(origins.has(window.location.origin)).toBe(true);
  });
});
