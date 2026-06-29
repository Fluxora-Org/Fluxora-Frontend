import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import HeroSection from "../components/landing-page/HeroSection";
import Footer from "../components/Footer";
import { Skeleton } from "../components/Skeleton";
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

  return (
    <div
      style={{
        backgroundColor: "var(--color-bg-primary)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main id="main-content" style={{ flex: 1 }}>
        <HeroSection theme={theme} />
        <LazySection label="value proposition section">
          <ValuePropositionSection />
        </LazySection>
        <LazySection label="trust section">
          <TrustSection theme={theme} />
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
