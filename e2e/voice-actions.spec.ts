import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end test suite for voice-initiated actions flow.
 *
 * Covers:
 * - Voice microphone toggle via user UI in navigation bar
 * - Speech recognition integration adhering to browser Web Speech API contracts
 * - Success path: destructive action ("Cancel stream") initiates confirmation modal
 *   and executes upon confirmation, navigating to the cancellation flow (/app/streams?action=cancel)
 * - Success path: structured speech commands with stream, recipient, and amount parameters
 * - Primary failure path: user cancellation / rejection of destructive action via Cancel button
 * - Primary failure path: user dismissal via Escape key and voice cancellation ("Cancel")
 * - Primary failure path: unrecognized speech phrases do not trigger execution or modals
 * - Primary failure path: microphone permission rejection handled gracefully
 * - Non-destructive action navigation ("Create stream", "Go to streams")
 *
 * Strictly tests user-facing behavior through DOM interactions and browser events
 * without reaching into React internals or private state.
 */

// Helper to inject mock SpeechRecognition and mock wallet before page scripts execute
async function setupMocks(page: Page) {
  const address = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";
  const network = "TESTNET";

  await page.addInitScript(
    ({ addr, net }) => {
      // 1. Mock Wallet state for RequireWallet
      window.localStorage.setItem("fluxora_wallet_address", addr);
      window.localStorage.setItem("fluxora_wallet_network", net);
      window.localStorage.setItem("fluxora_wallet_connected", "true");

      (window as unknown as { freighter: boolean }).freighter = true;

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

        let payload: Record<string, unknown>;
        switch (data.type) {
          case "REQUEST_CONNECTION_STATUS":
            payload = { isConnected: true };
            break;
          case "REQUEST_ALLOWED_STATUS":
          case "SET_ALLOWED_STATUS":
            payload = { isAllowed: true };
            break;
          case "REQUEST_PUBLIC_KEY":
          case "REQUEST_ACCESS":
          case "REQUEST_USER_INFO":
            payload = { publicKey: addr, address: addr };
            break;
          case "REQUEST_NETWORK":
          case "REQUEST_NETWORK_DETAILS":
            payload = {
              network: net,
              networkPassphrase: "Test SDF Network ; September 2015",
              networkUrl: "https://horizon-testnet.stellar.org",
              networkDetails: {
                network: net,
                networkPassphrase: "Test SDF Network ; September 2015",
                networkUrl: "https://horizon-testnet.stellar.org",
              },
            };
            break;
          default:
            payload = {};
        }

        window.postMessage(
          { ...base, ...payload, apiData: payload },
          window.location.origin,
        );
      });

      // 2. Mock SpeechRecognition implementation
      class MockSpeechRecognition {
        static activeInstance: MockSpeechRecognition | null = null;
        continuous = true;
        interimResults = true;
        lang = "en-US";
        onstart: (() => void) | null = null;
        onresult:
          | ((event: {
              results: Array<
                Array<{ transcript: string }> & { isFinal?: boolean }
              >;
            }) => void)
          | null = null;
        onerror: ((event: { error: string }) => void) | null = null;
        onend: (() => void) | null = null;

        start() {
          MockSpeechRecognition.activeInstance = this;
          setTimeout(() => {
            if (this.onstart) {
              this.onstart();
            }
          }, 10);
        }

        stop() {
          if (MockSpeechRecognition.activeInstance === this) {
            MockSpeechRecognition.activeInstance = null;
          }
          setTimeout(() => {
            if (this.onend) {
              this.onend();
            }
          }, 10);
        }

        abort() {
          this.stop();
        }
      }

      const win = window as unknown as Record<string, unknown>;
      win["SpeechRecognition"] = MockSpeechRecognition;
      win["webkitSpeechRecognition"] = MockSpeechRecognition;

      win["__mockSpeech"] = {
        emitResult: (transcript: string, isFinal = true) => {
          const instance = MockSpeechRecognition.activeInstance;
          if (!instance || !instance.onresult) return false;
          const resultItem = [{ transcript }] as Array<{
            transcript: string;
          }> & { isFinal?: boolean };
          resultItem.isFinal = isFinal;
          instance.onresult({
            results: [resultItem],
          });
          return true;
        },
        emitError: (error: string) => {
          const instance = MockSpeechRecognition.activeInstance;
          if (!instance || !instance.onerror) return false;
          instance.onerror({ error });
          return true;
        },
      };
    },
    { addr: address, net: network },
  );
}

interface MockSpeechController {
  emitResult: (transcript: string, isFinal?: boolean) => boolean;
  emitError: (error: string) => boolean;
}

async function emitSpokenPhrase(page: Page, phrase: string) {
  await page.evaluate((text) => {
    const mock = (
      window as unknown as Record<string, MockSpeechController | undefined>
    )["__mockSpeech"];
    if (!mock) throw new Error("Mock speech recognition not initialized");
    mock.emitResult(text, true);
  }, phrase);
}

async function emitSpeechError(page: Page, error: string) {
  await page.evaluate((err) => {
    const mock = (
      window as unknown as Record<string, MockSpeechController | undefined>
    )["__mockSpeech"];
    if (!mock) throw new Error("Mock speech recognition not initialized");
    mock.emitError(err);
  }, error);
}

test.describe("Voice-initiated actions flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("success path: voice command triggers confirmation modal and navigates on user confirmation", async ({
    page,
  }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    // 1. Locate and activate the voice mic button in the navbar
    const micButton = page.getByRole("button", {
      name: /enable voice commands/i,
    });
    await expect(micButton).toBeVisible();
    await micButton.click();

    // 2. Assert voice control enters active listening state
    const activeMicButton = page.getByRole("button", {
      name: /voice control active \(listening\)/i,
    });
    await expect(activeMicButton).toBeVisible();
    await expect(activeMicButton).toHaveAttribute("aria-pressed", "true");

    // 3. User speaks a destructive command: "Cancel stream"
    await emitSpokenPhrase(page, "Cancel stream");

    // 4. Confirmation modal appears on screen
    const confirmModal = page.getByRole("dialog", {
      name: "Voice Command Confirmation",
    });
    await expect(confirmModal).toBeVisible();

    // Verify modal content explains destructive action and shows details
    await expect(
      confirmModal.getByRole("heading", {
        name: "Voice Command Confirmation",
      }),
    ).toBeVisible();
    await expect(confirmModal).toContainText("Cancel stream");
    await expect(confirmModal.locator("dt:has-text('Action') + dd")).toHaveText(
      "Cancel stream",
    );

    // 5. User clicks "Confirm Action" button to proceed
    const confirmButton = confirmModal.getByRole("button", {
      name: "Confirm Action",
    });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // 6. Modal closes and application navigates to the cancellation flow
    await expect(confirmModal).toBeHidden();
    await expect(page).toHaveURL(/\/app\/streams\?action=cancel/);
  });

  test("success path: structured voice command with details confirmed via spoken 'Confirm'", async ({
    page,
  }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    // Activate voice control
    const micButton = page.getByRole("button", {
      name: /enable voice commands/i,
    });
    await micButton.click();

    await expect(
      page.getByRole("button", {
        name: /voice control active \(listening\)/i,
      }),
    ).toBeVisible();

    // Speak structured destructive command with stream ID, recipient, and amount
    await emitSpokenPhrase(
      page,
      "Cancel stream STR-001 for Alice amount 250 USDC",
    );

    const confirmModal = page.getByRole("dialog", {
      name: "Voice Command Confirmation",
    });
    await expect(confirmModal).toBeVisible();

    // Verify parsed parameters are displayed to user for safety
    await expect(confirmModal.locator("dt:has-text('Stream') + dd")).toHaveText(
      "STR-001",
    );
    await expect(
      confirmModal.locator("dt:has-text('Recipient') + dd"),
    ).toHaveText("Alice");
    await expect(confirmModal.locator("dt:has-text('Amount') + dd")).toHaveText(
      "250 USDC",
    );

    // User confirms using voice by saying "Confirm"
    await emitSpokenPhrase(page, "Confirm");

    // Modal closes and user is redirected to cancellation flow
    await expect(confirmModal).toBeHidden();
    await expect(page).toHaveURL(/\/app\/streams\?action=cancel/);
  });

  test("primary failure path: user cancels confirmation modal via Cancel button, preventing execution", async ({
    page,
  }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    // Activate voice control
    const micButton = page.getByRole("button", {
      name: /enable voice commands/i,
    });
    await micButton.click();

    await expect(
      page.getByRole("button", {
        name: /voice control active \(listening\)/i,
      }),
    ).toBeVisible();

    // Speak destructive command
    await emitSpokenPhrase(page, "Cancel stream");

    const confirmModal = page.getByRole("dialog", {
      name: "Voice Command Confirmation",
    });
    await expect(confirmModal).toBeVisible();

    // User aborts by clicking the "Cancel" button
    const cancelButton = confirmModal.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Modal closes and action is aborted
    await expect(confirmModal).toBeHidden();

    // Assert the action was NOT executed: URL remains on /app without action query param
    await expect(page).toHaveURL(/\/app$/);
    expect(page.url()).not.toContain("action=cancel");
  });

  test("primary failure path: user dismisses confirmation modal via Escape key and voice 'Cancel'", async ({
    page,
  }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    // Activate voice control
    const micButton = page.getByRole("button", {
      name: /enable voice commands/i,
    });
    await micButton.click();

    // 1. Test Escape key dismissal
    await emitSpokenPhrase(page, "Cancel stream");
    const confirmModal = page.getByRole("dialog", {
      name: "Voice Command Confirmation",
    });
    await expect(confirmModal).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(confirmModal).toBeHidden();
    expect(page.url()).not.toContain("action=cancel");

    // 2. Test voice cancellation ("Cancel")
    await emitSpokenPhrase(page, "Cancel stream");
    await expect(confirmModal).toBeVisible();

    await emitSpokenPhrase(page, "Cancel");
    await expect(confirmModal).toBeHidden();
    expect(page.url()).not.toContain("action=cancel");
  });

  test("primary failure path: unrecognized voice command does not trigger actions or modals", async ({
    page,
  }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    const micButton = page.getByRole("button", {
      name: /enable voice commands/i,
    });
    await micButton.click();
    await expect(
      page.getByRole("button", { name: /voice control active \(listening\)/i }),
    ).toBeVisible();

    // Emit unrecognized command
    await emitSpokenPhrase(page, "Delete entire treasury vault");

    // Assert confirmation modal never appears
    const confirmModal = page.getByRole("dialog", {
      name: "Voice Command Confirmation",
    });
    await expect(confirmModal).toHaveCount(0);

    // Mic button reflects unrecognized state
    await expect(
      page.getByRole("button", { name: /voice command not recognized/i }),
    ).toBeVisible();

    // URL remains unchanged
    expect(page.url()).not.toContain("action=");
  });

  test("primary failure path: microphone permission denied updates status without opening modals", async ({
    page,
  }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    const micButton = page.getByRole("button", {
      name: /enable voice commands/i,
    });
    await micButton.click();

    // Simulate browser permission denial error
    await emitSpeechError(page, "not-allowed");

    // Mic button transitions to blocked / denied state
    await expect(
      page.getByRole("button", {
        name: /microphone access blocked/i,
      }),
    ).toBeVisible();

    // No modal is displayed
    const confirmModal = page.getByRole("dialog", {
      name: "Voice Command Confirmation",
    });
    await expect(confirmModal).toHaveCount(0);
  });

  test("non-destructive voice action navigation: navigates correctly to target views", async ({
    page,
  }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    const micButton = page.getByRole("button", {
      name: /enable voice commands/i,
    });
    await micButton.click();
    await expect(
      page.getByRole("button", { name: /voice control active \(listening\)/i }),
    ).toBeVisible();

    // Voice navigation to streams
    await emitSpokenPhrase(page, "Go to streams");
    await expect(page).toHaveURL(/\/app\/streams$/);

    // Voice action to create stream
    await emitSpokenPhrase(page, "Create stream");
    await expect(page).toHaveURL(/\/app\/streams\?action=create/);
  });
});
