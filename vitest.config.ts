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
        // Public landing page and its lazy-section infrastructure
        "src/pages/Home.tsx",
        "src/components/GlowingDot.tsx",
        "src/components/GetStartedCTA.tsx",
        "src/components/InputField.tsx",
        "src/components/InputWithUnit.tsx",
        "src/components/NewsletterSection.tsx",
        "src/components/ZeroAccrualBanner.tsx",
        "src/components/useModalAccessibility.ts",
        "src/components/navigation/NavLink.tsx",
        "src/components/navigation/ThemeSegmentedControl.tsx",
        "src/components/RecentStreams.tsx",
        "src/components/StreamsLoading.tsx",
        "src/components/ToastNotification.tsx",
        "src/components/TreasuryOverviewLoading.tsx",
        "src/components/WalletIcon.tsx",
        "src/components/treasuryOverviewPage/MetricCard.tsx",
        "src/components/treasuryOverviewPage/StatusPill.tsx",
        "src/components/treasuryOverviewPage/Metrics.tsx",
        "src/components/treasuryOverviewPage/RecentStreams.tsx",
        "src/components/treasuryOverviewPage/StreamRow.tsx",
        "src/components/treasuryOverviewPage/useTreasury.ts",
        "src/components/wallet-connect/Walletbutton.tsx",
        "src/data/streamRecords.ts",
        "src/fixtures/malformedStreamRecords.ts",
        "src/lib/formatters.ts",
        "src/lib/config.ts",
        "src/lib/stellarNetwork.ts",
        "src/lib/stellar.ts",
        "src/lib/api/newsletterService.ts",
        "src/lib/recentStreamMapper.ts",
        "src/lib/sorobanTxStatus.ts",
        "src/theme/ThemeProvider.tsx",
        "src/theme/themeBootstrap.ts",
        // Colour-blind simulation module
        "src/components/colorBlindSimulation/ColorBlindSimulationProvider.tsx",
        "src/components/colorBlindSimulation/ColorBlindToggle.tsx",
        // Contrast utilities
        "src/utils/contrastUtils.ts",
        // Dynamic favicon badge
        "src/utils/faviconBadge.ts",
        // Activity Heatmap
        "src/components/treasuryOverviewPage/ActivityHeatmap.tsx",
        // Treasury flow Sankey diagram
        "src/components/treasuryOverviewPage/TreasuryFlowSankey.tsx",
        // Presence feature
        "src/components/presence/PresenceBadge.tsx",
        "src/components/presence/PresenceViewerList.tsx",
        "src/hooks/usePresenceViewers.ts",
        "src/hooks/useEmbedAccessibility.ts",
        // CSV bulk-upload feature
        "src/components/csv-upload/csvParser.ts",
        "src/components/csv-upload/CsvDropZone.tsx",
        "src/components/csv-upload/ColumnMappingStep.tsx",
        "src/components/csv-upload/PreviewValidateStep.tsx",
      ],
      exclude: [
        "src/components/**/*.test.tsx",
        "src/theme/**/__tests__/**",
        "src/components/colorBlindSimulation/__tests__/**",
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
});
