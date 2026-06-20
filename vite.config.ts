/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isTesting = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

export default defineConfig(async () => {
  const plugins = isTesting
    ? [react()]
    : [react(), (await import("@tailwindcss/vite")).default()];

  return {
    plugins,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, "/");

            if (normalizedId.includes("/src/pages/Dashboard")) {
              return "app-dashboard";
            }
            if (normalizedId.includes("/src/pages/Streams")) {
              return "app-streams";
            }
            if (normalizedId.includes("/src/pages/Recipient")) {
              return "app-recipient";
            }
            if (normalizedId.includes("/src/pages/TreasuryPage")) {
              return "app-treasury";
            }
            if (normalizedId.includes("/src/pages/EmptyStateDemo")) {
              return "app-empty-state-demo";
            }
          },
        },
      },
    },
    server: { port: 5173 },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        include: ["src/components/**/*.tsx", "src/pages/**/*.tsx", "src/theme/**/*.tsx"],
        exclude: [
          "src/components/**/*.test.tsx",
          "src/pages/**/*.test.tsx",
          "src/theme/**/__tests__/**",
        ],
        thresholds: {
          lines: 95,
          functions: 95,
          branches: 95,
          statements: 95,
        },
      },
    },
  };
});
