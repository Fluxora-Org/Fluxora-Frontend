import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { lazy, Suspense, useState, type ReactElement } from "react";
import Layout from "./components/Layout";
import AppNavbar from "./components/navigation/AppNavbar";
import { Skeleton, SkeletonCard } from "./components/Skeleton";
import { ThemeProvider } from "./theme/ThemeProvider";
import { WalletProvider } from "./components/wallet-connect/Walletcontext";
import { ToastProvider } from "./components/toast/ToastProvider";
import { I18nProvider } from "./i18n";
import ErrorBoundary from "./components/ErrorBoundary";
import RequireWallet from "./components/RequireWallet";
import Home from "./pages/Home";
import ConnectWallet from "./pages/ConnectWallet";
import ErrorPage from "./pages/ErrorPage";
import NotFound from "./pages/NotFound";
import { VoiceProvider } from "./components/voice/VoiceContext";
import { VoiceCommandPanel } from "./components/voice/VoiceCommandPanel";
import { VoiceConfirmModal } from "./components/voice/VoiceConfirmModal";
import { getRecipientRouteKey } from "./pages/recipientRouteKey";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Streams = lazy(() => import("./pages/Streams"));
const StreamDetail = lazy(() => import("./pages/StreamDetail"));
const Recipient = lazy(() => import("./pages/Recipient"));
const TreasuryPage = lazy(() => import("./pages/TreasuryPage"));
const EmbedStreamWidget = lazy(() => import("./pages/EmbedStreamWidget"));
import { IS_DEV } from "./utils/env";

const EmptyStateDemo = IS_DEV
  ? lazy(() => import("./pages/EmptyStateDemo"))
  : () => null;

const ComponentGallery = IS_DEV
  ? lazy(() => import("./pages/dev/ComponentGallery"))
  : () => null;


function LegacyStreamRedirect() {
  const { streamId } = useParams();
  return (
    <Navigate
      to={streamId ? `/app/streams/${streamId}` : "/app/streams"}
      replace
    />
  );
}

function RecipientRoute() {
  const location = useLocation();
  return <Recipient key={getRecipientRouteKey(location.pathname, location.search)} />;
}

function AppRouteFallback() {
  return (
    <div role="status" aria-label="Loading app page" aria-busy="true">
      <span className="sr-only">Loading app page...</span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: "1.5rem",
        }}
      >
        <Skeleton width={220} height={28} borderRadius={8} />
        <Skeleton width={340} height={14} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
        aria-hidden="true"
      >
        {[0, 1, 2].map((item) => (
          <SkeletonCard
            key={item}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <Skeleton width={40} height={40} borderRadius={8} />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <Skeleton height={10} width="45%" />
              <Skeleton height={18} width="70%" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

function lazyAppRoute(element: ReactElement) {
  return <Suspense fallback={<AppRouteFallback />}>{element}</Suspense>;
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSidebarToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <VoiceProvider>
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
                    <Route path="/landing" element={<Navigate to="/" replace />} />
                    <Route
                      path="/app"
                      element={
                        <RequireWallet>
                          <Layout />
                        </RequireWallet>
                      }
                    >
                      <Route index element={lazyAppRoute(<Dashboard />)} />
                      <Route path="streams" element={lazyAppRoute(<Streams />)} />
                      <Route path="streams/:streamId" element={lazyAppRoute(<StreamDetail />)} />
                      <Route path="recipient" element={lazyAppRoute(<RecipientRoute />)} />
                      <Route path="treasurypage" element={lazyAppRoute(<TreasuryPage />)} />
                      <Route path="error" element={<ErrorPage />} />
                      {IS_DEV && (
                        <Route
                          path="empty-state-demo"
                          element={lazyAppRoute(<EmptyStateDemo />)}
                        />
                      )}
                      {IS_DEV && (
                        <Route
                          path="component-gallery"
                          element={lazyAppRoute(<ComponentGallery />)}
                        />
                      )}
                    </Route>
                    <Route path="/connect-wallet" element={<ConnectWallet />} />
                    <Route path="/embed/streams/:streamId" element={<EmbedStreamWidget />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>

                {/* Voice Control Reference Panel & Destructive Action Modal */}
                <VoiceCommandPanel />
                <VoiceConfirmModal />
              </ToastProvider>
            </WalletProvider>
          </VoiceProvider>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  );
}
