/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { SECURITY_HEADERS } from "./src/lib/securityHeaders";

const isTesting = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
const CHUNK_SIZE_WARNING_LIMIT_KB = 650;

/**
 * Vite plugin that injects the canonical security headers into every response
 * served by the dev server (vite dev) and the preview server (vite preview).
 *
 * This ensures that:
 *  - The full Content-Security-Policy (including frame-ancestors 'none') is
 *    sent as an HTTP header, not just the <meta> fallback in index.html.
 *  - X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
 *    Permissions-Policy, Cross-Origin-Opener-Policy, and
 *    Cross-Origin-Resource-Policy are present on all responses.
 *
 * Production deployments should replicate these headers at the reverse-proxy
 * or CDN layer and add Strict-Transport-Security (HSTS). The preview server
 * intentionally omits HSTS because it runs over plain HTTP on localhost.
 *
 * See src/lib/securityHeaders.ts for design rationale and the embed-widget
 * frame-ancestors override instructions.
 */
function securityHeadersPlugin(): Plugin {
  const applyHeaders = (
    res: { setHeader: (name: string, value: string) => void }
  ) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(name, value);
    }
  };

  return {
    name: "security-headers",
    // Dev server (vite dev)
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        applyHeaders(res);
        next();
      });
    },
    // Preview server (vite preview / vite preview --host 127.0.0.1)
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        applyHeaders(res);
        next();
      });
    },
  };
}

function vendorChunk(id: string) {
  if (!id.includes("node_modules")) return undefined;

  // Keep React and the router together so React hooks resolve against one copy.
  if (
    id.includes("/react/") ||
    id.includes("/react-dom/") ||
    id.includes("/react-router/") ||
    id.includes("/react-router-dom/")
  ) {
    return "vendor-react";
  }

  if (id.includes("@stellar/freighter-api")) {
    return "vendor-stellar";
  }

  if (id.includes("/lucide-react/") || id.includes("/react-icons/")) {
    return "vendor-icons";
  }

  return "vendor";
}

export default defineConfig(async () => {
  const plugins = isTesting
    ? [react()]
    : [react(), (await import("@tailwindcss/vite")).default(), securityHeadersPlugin()];

  return {
    plugins,
    server: { port: 5173 },
    build: {
      chunkSizeWarningLimit: CHUNK_SIZE_WARNING_LIMIT_KB,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            const normalizedId = id.replace(/\\/g, "/");

            // App-page code splitting (lazy routes).
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

            // Below-the-fold landing sections are lazy-loaded from Home and
            // share one chunk so they download together once the user scrolls.
            if (
              normalizedId.includes("/src/components/landing-page/TrustSection") ||
              normalizedId.includes("/src/components/ValuePropositionSection") ||
              normalizedId.includes("/src/components/GetStartedCTA") ||
              normalizedId.includes("/src/components/NewsletterSection")
            ) {
              return "app-landing";
            }

            // Vendor splitting for bundle-size visibility.
            return vendorChunk(id);
          },
        },
      },
    },
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
