import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { lazy, useState, type ComponentType, type ReactElement } from "react";
import Layout from "./components/Layout";
import AppNavbar from "./components/navigation/AppNavbar";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
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
import RequireWalletAction from "./components/RequireWalletAction";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Streams = lazy(() => import("./pages/Streams"));
const StreamDetail = lazy(() => import("./pages/StreamDetail"));
const Recipient = lazy(() => import("./pages/Recipient"));
const TreasuryPage = lazy(() => import("./pages/TreasuryPage"));
const EmbedStreamWidget = lazy(() => import("./pages/EmbedStreamWidget"));
import { IS_DEV } from "./utils/env";
import { configError } from "./lib/config";

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

function lazyAppRoute(
  element: ReactElement,
  load?: () => Promise<{ default: ComponentType }>,
) {
  return <RouteErrorBoundary load={load}>{element}</RouteErrorBoundary>;
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (configError) {
    return (
      <ErrorPage
        type="validation"
        headline="Configuration needs attention"
        errorMessage={`Fluxora cannot start safely. ${configError.message} Update your VITE_* variables and restart the development server or rebuild the application.`}
        primaryCtaText="Reload"
      />
    );
  }

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
                      <Route index element={lazyAppRoute(<Dashboard />, () => import("./pages/Dashboard"))} />
                      <Route path="streams/:streamId" element={<RequireWalletAction>{lazyAppRoute(<Streams />, () => import("./pages/Streams"))}</RequireWalletAction>} />
                      <Route path="streams" element={<RequireWalletAction>{lazyAppRoute(<StreamDetail />, () => import("./pages/StreamDetail"))}</RequireWalletAction>} />
                      <Route path="recipient" element={<RequireWalletAction>{lazyAppRoute(<RecipientRoute />)}</RequireWalletAction>} />
                      <Route path="treasurypage" element={lazyAppRoute(<TreasuryPage />, () => import("./pages/TreasuryPage"))} />
                      <Route path="error" element={<ErrorPage />} />
                      {IS_DEV && (
                        <Route
                          path="empty-state-demo"
                          element={lazyAppRoute(<EmptyStateDemo />, () => import("./pages/EmptyStateDemo"))}
                        />
                      )}
                      {IS_DEV && (
                        <Route
                          path="component-gallery"
                          element={lazyAppRoute(<ComponentGallery />, () => import("./pages/dev/ComponentGallery"))}
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
