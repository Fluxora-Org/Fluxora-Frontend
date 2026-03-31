import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import AppNavbar from "./components/navigation/AppNavbar";
import { WalletProvider } from "./components/wallet-connect/Walletcontext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Streams from "./pages/Streams";
import Recipient from "./pages/Recipient";
import ConnectWallet from "./pages/ConnectWallet";
import Landing from "./pages/Landing";
import TreasuryPage from "./pages/TreasuryPage";
import ErrorPage from "./pages/ErrorPage";
import NotFound from "./pages/NotFound";

function LegacyStreamRedirect() {
  const { streamId } = useParams();
  return (
    <Navigate
      to={streamId ? `/app/streams/${streamId}` : "/app/streams"}
      replace
    />
  );
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved as "light" | "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    if (theme === "light") {
      root.style.setProperty("--bg", "#ffffff");
      root.style.setProperty("--surface", "#f5f7fa");
      root.style.setProperty("--border", "#e0e6ed");
      root.style.setProperty("--text", "#1a1f36");
      root.style.setProperty("--muted", "#6b7a94");
      root.style.setProperty("--accent", "#00d4aa");
      root.style.setProperty("--accent-dim", "#00a884");
      root.style.setProperty("--navbar-bg", "#ffffff");
      root.style.setProperty("--navbar-border", "#e0e6ed");
      root.style.setProperty("--navbar-logo-color", "#1a1f36");
      root.style.setProperty("--navbar-link-color", "#4A5565");
      root.style.setProperty("--navbar-icon-color", "#6b7a94");
      root.style.setProperty("--navbar-icon-border", "#d0d7e0");
      root.style.setProperty(
        "--navbar-shadow",
        "0 2px 8px rgba(0, 0, 0, 0.08)",
      );
      root.style.setProperty("--cta-bg", "#00d4aa");
      root.style.setProperty(
        "--cta-shadow",
        "0 4px 12px rgba(0, 212, 170, 0.2)",
      );
      root.style.setProperty("--network-testnet-bg", "#fef3c7");
      root.style.setProperty("--network-testnet-text", "#92400e");
    } else {
      root.style.setProperty("--bg", "#0a0e17");
      root.style.setProperty("--surface", "#121a2a");
      root.style.setProperty("--border", "#1e2d42");
      root.style.setProperty("--text", "#e8ecf4");
      root.style.setProperty("--muted", "#6b7a94");
      root.style.setProperty("--accent", "#00d4aa");
      root.style.setProperty("--accent-dim", "#00a884");
      root.style.setProperty("--navbar-bg", "#0f1419");
      root.style.setProperty("--navbar-border", "#1a2534");
      root.style.setProperty("--navbar-logo-color", "#e8ecf4");
      root.style.setProperty("--navbar-link-color", "#9ca3af");
      root.style.setProperty("--navbar-icon-color", "#9ca3af");
      root.style.setProperty("--navbar-icon-border", "#374151");
      root.style.setProperty(
        "--navbar-shadow",
        "0 4px 12px rgba(0, 0, 0, 0.3)",
      );
      root.style.setProperty("--cta-bg", "#00d4aa");
      root.style.setProperty(
        "--cta-shadow",
        "0 4px 12px rgba(0, 212, 170, 0.3)",
      );
      root.style.setProperty("--network-testnet-bg", "rgba(250,224,141,0.15)");
      root.style.setProperty("--network-testnet-text", "#fbd96a");
    }
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <BrowserRouter>
      <WalletProvider>
        <AppNavbar onThemeToggle={handleThemeToggle} theme={theme} />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/streams" element={<Navigate to="/app/streams" replace />} />
          <Route path="/streams/:streamId" element={<LegacyStreamRedirect />} />
          <Route path="/landing" element={<Landing theme={theme} />} />
          <Route
            path="/app"
            element={<Layout onThemeToggle={handleThemeToggle} theme={theme} />}
          >
            <Route index element={<Dashboard />} />
            <Route path="streams" element={<Streams />} />
            <Route path="streams/:streamId" element={<Streams />} />
            <Route path="recipient" element={<Recipient />} />
            <Route path="treasurypage" element={<TreasuryPage />} />
            <Route path="error" element={<ErrorPage />} />
          </Route>
          <Route path="/connect-wallet" element={<ConnectWallet />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </WalletProvider>
    </BrowserRouter>
  );
}
