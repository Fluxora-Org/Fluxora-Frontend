import HeroSection from "../components/landing-page/HeroSection";
import TrustSection from "../components/landing-page/TrustSection";
import ValuePropositionSection from "../components/ValuePropositionSection";
import GetStartedCTA from "../components/GetStartedCTA";
import NewsletterSection from "../components/NewsletterSection";
import Footer from "../components/Footer";
import { useTheme } from "../theme/ThemeProvider";

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
      <main 
        id="main-content"
        style={{ flex: 1 }}
      >
        <HeroSection theme={theme} />
        <ValuePropositionSection />
        <TrustSection theme={theme} />
        <section style={{ padding: "80px 20px" }} aria-label="Get started">
          <GetStartedCTA />
        </section>
        <NewsletterSection />
      </main>
      <Footer />
    </div>
  );
}
