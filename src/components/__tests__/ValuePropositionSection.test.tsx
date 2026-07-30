import { render, screen } from "@testing-library/react";
import ValuePropositionSection from "../ValuePropositionSection";
import { vi } from 'vitest';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Clock: () => <svg data-testid="icon" />,
  Settings: () => <svg data-testid="icon" />,
  PauseCircle: () => <svg data-testid="icon" />,
  Star: () => <svg data-testid="icon" />, 
}));
describe("ValuePropositionSection", () => {
  test("renders headline, subhead and all feature cards", () => {
    render(<ValuePropositionSection />);

    // Headline and subhead
    expect(screen.getByRole("heading", { level: 2, name: /Treasury streaming infrastructure/i })).toBeInTheDocument();
    expect(screen.getByText(/Everything you need to manage continuous capital flow on Stellar/i)).toBeInTheDocument();

    // Feature card titles
    const titles = [
      "Real-time USDC streaming",
      "Configurable rate & cliff",
      "Pause and cancel controls",
      "Built on Stellar & Soroban",
    ];
    titles.forEach((title) => {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    });

    // Feature card descriptions (partial match)
    const descriptions = [
      "Funds accrue per second; recipients withdraw anytime",
      "Set streaming rate, start/end timestamps, and optional cliff periods",
      "Treasury or admin can pause or cancel active streams",
      "Native Stellar infrastructure. Soroban smart contracts",
    ];
    descriptions.forEach((desc) => {
      const matches = screen.getAllByText((_content, element) => Boolean(element?.textContent?.includes(desc)));
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
