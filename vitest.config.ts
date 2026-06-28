/// <reference types="vitest" />
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

// Separate vitest config that omits the @tailwindcss/vite plugin.
// The tailwindcss plugin requires a native binary (@tailwindcss/oxide)
// that is not needed during unit tests (jsdom environment).
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    // Playwright owns the e2e/ specs; keep them out of the vitest run.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/components/ConnectButton.tsx",
        "src/components/GlowingDot.tsx",
        "src/components/InputField.tsx",
        "src/components/InputWithUnit.tsx",
        "src/components/StreamsLoading.tsx",
        "src/components/ToastNotification.tsx",
        "src/components/TreasuryOverviewLoading.tsx",
        "src/components/treasuryOverviewPage/MetricCard.tsx",
        "src/components/treasuryOverviewPage/StatusPill.tsx",
        "src/components/treasuryOverviewPage/Metrics.tsx",
        "src/components/treasuryOverviewPage/RecentStreams.tsx",
        "src/components/treasuryOverviewPage/useTreasury.ts",
        "src/theme/ThemeProvider.tsx",
      ],
      exclude: ["src/components/**/*.test.tsx", "src/theme/**/__tests__/**"],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
});
