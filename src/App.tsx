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
import ErrorPage from "./pages/ErrorPage";
import NotFound from "./pages/NotFound";
import TreasuryPage from "./pages/TreasuryPage";
import EmptyStateDemo from "./pages/EmptyStateDemo";

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
    return (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <BrowserRouter>
      <WalletProvider>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <AppNavbar 
          onThemeToggle={handleThemeToggle} 
          theme={theme} 
          onSidebarToggle={handleSidebarToggle}
          isSidebarOpen={isSidebarOpen}
        />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/streams" element={<Navigate to="/app/streams" replace />} />
          <Route path="/streams/:streamId" element={<LegacyStreamRedirect />} />
          <Route path="/landing" element={<Landing theme={theme} />} />
          <Route
            path="/app"
            element={
              <Layout />
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="streams" element={<Streams />} />
            <Route path="streams/:streamId" element={<Streams />} />
            <Route path="recipient" element={<Recipient />} />
            <Route path="treasurypage" element={<TreasuryPage />} />
            <Route path="error" element={<ErrorPage />} />
            <Route path="empty-state-demo" element={<EmptyStateDemo />} />
          </Route>
          <Route path="/connect-wallet" element={<ConnectWallet />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </WalletProvider>
    </BrowserRouter>
  );
}
