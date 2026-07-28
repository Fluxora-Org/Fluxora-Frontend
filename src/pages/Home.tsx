import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import HeroSection from "../components/landing-page/HeroSection";
import Footer from "../components/Footer";
import { Skeleton } from "../components/Skeleton";
import {
  isMobileViewport,
  VIEWPORT_RESIZE_DEBOUNCE_MS,
} from "../lib/breakpoints";
import { useTheme } from "../theme/ThemeProvider";

// Below-the-fold landing sections are split into separate chunks via React.lazy
// so first-time visitors don't pay the parse cost up front. Each section is only
// imported once it nears the viewport (see LazySection / IntersectionObserver).
const TrustSection = lazy(() => import("../components/landing-page/TrustSection"));
const ValuePropositionSection = lazy(
  () => import("../components/ValuePropositionSection"),
);
const GetStartedCTA = lazy(() => import("../components/GetStartedCTA"));
const NewsletterSection = lazy(() => import("../components/NewsletterSection"));

interface LazySectionProps {
  children: React.ReactNode;
  /** Accessible label for the placeholder region while the section loads. */
  label: string;
}

/**
 * Defers rendering (and therefore the dynamic import) of its children until the
 * placeholder scrolls within 300px of the viewport. When IntersectionObserver is
 * unavailable (older browsers, jsdom/SSR), it falls back to loading immediately.
 */
function LazySection({ children, label }: LazySectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (shouldLoad) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={ref}>
      {shouldLoad ? (
        <Suspense fallback={<Skeleton height={240} aria-label={`Loading ${label}`} />}>
          {children}
        </Suspense>
      ) : (
        <Skeleton height={240} aria-label={`Loading ${label}`} />
      )}
    </div>
  );
}

export default function Home() {
  const { theme } = useTheme();
  // Initialise synchronously from the live viewport so the very first render
  // already uses the correct layout tier. Falls back to `false` (desktop) in
  // non-browser / SSR environments so the component is still renderable.
  const [isMobileLayout, setIsMobileLayout] = useState<boolean>(() =>
    typeof window !== "undefined" ? isMobileViewport() : false,
  );

  useEffect(() => {
    // Skip the listener entirely in non-browser environments (SSR / tests that
    // do not expose `window`).
    if (typeof window === "undefined") return;

    let timeoutId: ReturnType<typeof window.setTimeout> | undefined;

    // Debounced handler — collapses rapid resize / orientationchange events
    // into a single state update so re-renders are kept to a minimum.
    const handleResize = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        timeoutId = undefined;
        setIsMobileLayout(isMobileViewport());
      }, VIEWPORT_RESIZE_DEBOUNCE_MS);
    };

    // orientationchange fires on mobile before innerWidth has updated, so we
    // listen to both events and let the debounce coalesce them into one read.
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      // Cancel any in-flight debounce so unmounting components can never
      // trigger a state update on an already-unmounted tree.
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div
      style={{
        backgroundColor: "var(--color-bg-primary)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main
        id="main-content"
        data-mobile-layout={isMobileLayout ? "mobile" : "desktop"}
        style={{ flex: 1 }}
      >
        <HeroSection theme={theme as "light" | "dark"} />
        <LazySection label="value proposition section">
          <ValuePropositionSection />
        </LazySection>
        <LazySection label="trust section">
          <TrustSection theme={theme as "light" | "dark"} />
        </LazySection>
        <LazySection label="get started section">
          <section style={{ padding: "80px 20px" }} aria-label="Get started">
            <GetStartedCTA />
          </section>
        </LazySection>
        <LazySection label="newsletter section">
          <NewsletterSection />
        </LazySection>
      </main>
      <Footer />
    </div>
  );
}
