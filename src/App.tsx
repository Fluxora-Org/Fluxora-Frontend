import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useState } from "react";
import Layout from "./components/Layout";
import AppNavbar from "./components/navigation/AppNavbar";
import { ThemeProvider } from "./theme/ThemeProvider";
import { WalletProvider } from "./components/wallet-connect/Walletcontext";
import { ToastProvider } from "./components/toast/ToastProvider";
import ErrorBoundary from "./components/ErrorBoundary";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSidebarToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <WalletProvider>
          <ToastProvider>
            <a href="#main-content" className="skip-link">
              Skip to content
            </a>
            <AppNavbar
              onSidebarToggle={handleSidebarToggle}
              isSidebarOpen={isSidebarOpen}
            />

            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Navigate to="/app" replace />} />
                <Route path="/streams" element={<Navigate to="/app/streams" replace />} />
                <Route path="/streams/:streamId" element={<LegacyStreamRedirect />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/app" element={<Layout />}>
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
            </ErrorBoundary>
          </ToastProvider>
        </WalletProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
