import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Streams from "./pages/Streams";
import Recipient from "./pages/Recipient";
import ConnectWallet from "./pages/ConnectWallet";
import { useState, useEffect } from "react";
import Landing from "./pages/Landing";
import Navbar from "./components/Navbar";
import ErrorPage from './pages/ErrorPage';
import NotFound from "./pages/NotFound";

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
    }
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="/streams" element={<Navigate to="/app/streams" replace />} />
        <Route
          path="/landing"
          element={
            <>
              <Navbar onThemeToggle={handleThemeToggle} theme={theme} />
              <Landing theme={theme} />
            </>
          }
        />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="streams" element={<Streams />} />
          <Route path="recipient" element={<Recipient />} />
          <Route path="error" element={<ErrorPage />} />
        </Route>
        <Route path="/connect-wallet" element={<ConnectWallet />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
