import HeroSection from "../components/landing-page/HeroSection";
import TrustSection from "../components/landing-page/TrustSection";

interface LandingProps {
  theme?: "light" | "dark";
}

export default function Landing({ theme = "light" }: LandingProps) {
  return (
    <div className="flex flex-col">
      <HeroSection theme={theme} />
      <TrustSection theme={theme} />
    </div>
  );
}
