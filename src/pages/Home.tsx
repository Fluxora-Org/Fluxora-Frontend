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

/**
 * Height of the skeleton placeholder rendered while a lazy section is waiting
 * to intersect the viewport, or while its dynamic import resolves.
 *
 * Kept as a named constant so tests can assert the value without duplicating
 * the magic number, and so a single edit propagates everywhere.
 */
export const LAZY_SECTION_SKELETON_HEIGHT = 240;

/**
 * The rootMargin passed to IntersectionObserver when observing each lazy
 * section placeholder. A positive value starts loading the section before it
 * actually scrolls into the visible area, reducing perceived blank flashes.
 *
 * Exported so tests can assert the exact value without duplicating it.
 */
export const LAZY_SECTION_ROOT_MARGIN = "300px";

interface LazySectionProps {
  children: React.ReactNode;
  /** Accessible label for the placeholder region while the section loads. */
  label: string;
  /** Optional data-testid forwarded to the wrapper element. */
  "data-testid"?: string;
}

/**
 * Defers rendering (and therefore the dynamic import) of its children until the
 * placeholder scrolls within LAZY_SECTION_ROOT_MARGIN of the viewport. When
 * IntersectionObserver is unavailable (older browsers, jsdom/SSR), it falls
 * back to loading immediately.
 */
function LazySection({ children, label, "data-testid": testId }: LazySectionProps) {
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
      { rootMargin: LAZY_SECTION_ROOT_MARGIN },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={ref} data-testid={testId}>
      {shouldLoad ? (
        <Suspense
          fallback={
            <Skeleton
              height={LAZY_SECTION_SKELETON_HEIGHT}
              aria-label={`Loading ${label}`}
            />
          }
        >
          {children}
        </Suspense>
      ) : (
        <Skeleton
          height={LAZY_SECTION_SKELETON_HEIGHT}
          aria-label={`Loading ${label}`}
        />
      )}
    </div>
  );
}

export default function Home() {
  const { theme } = useTheme();
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return isMobileViewport();
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let timeoutId: ReturnType<typeof window.setTimeout> | undefined;

    const handleResize = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        setIsMobileLayout(isMobileViewport());
      }, VIEWPORT_RESIZE_DEBOUNCE_MS);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (timeoutId) {
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
        <LazySection
          label="value proposition section"
          data-testid="lazy-section-value-proposition"
        >
          <ValuePropositionSection />
        </LazySection>
        <LazySection
          label="trust section"
          data-testid="lazy-section-trust"
        >
          <TrustSection theme={theme as "light" | "dark"} />
        </LazySection>
        <LazySection
          label="get started section"
          data-testid="lazy-section-get-started"
        >
          <section
            style={{ padding: "80px 20px" }}
            aria-label="Get started"
            data-testid="get-started-section-wrapper"
          >
            <GetStartedCTA />
          </section>
        </LazySection>
        <LazySection
          label="newsletter section"
          data-testid="lazy-section-newsletter"
        >
          <NewsletterSection />
        </LazySection>
      </main>
      <Footer />
    </div>
  );
}
