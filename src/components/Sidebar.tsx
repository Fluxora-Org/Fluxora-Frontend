import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  VIEWPORT_RESIZE_DEBOUNCE_MS,
  isMobileViewport,
} from "../lib/breakpoints";
import {
  LayoutDashboard,
  List,
  User,
  FileText,
  Scale,
  ChevronLeft,
  X,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let debounceId: ReturnType<typeof setTimeout> | undefined;

    const syncMobileState = () => {
      const mobile = isMobileViewport();
      setIsMobile((prev) => (prev === mobile ? prev : mobile));
    };

    const handleResize = () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(syncMobileState, VIEWPORT_RESIZE_DEBOUNCE_MS);
    };

    syncMobileState();
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(debounceId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Escape key support
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  // Focus trapping
  useEffect(() => {
    if (!mobileOpen || !sidebarRef.current) return;

    const focusableElements = sidebarRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, [mobileOpen]);

  const navItems = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/streams", label: "Streams", icon: List },
    { to: "/app/recipient", label: "Recipient", icon: User },
  ];

  const utilityItems = [
    { href: "#", label: "Documentation", icon: FileText },
    { href: "#", label: "Legal", icon: Scale },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Sidebar Drawer */}
      <aside
        ref={sidebarRef}
        id="app-sidebar"
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-300 ease-in-out flex flex-col",
          // Mobile state
          "max-md:w-[280px] max-md:shadow-xl",
          mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
          // Desktop state
          "md:translate-x-0",
          collapsed ? "md:w-20" : "md:w-64"
        )}
        role="navigation"
        aria-label="Primary navigation"
        aria-hidden={isMobile && !mobileOpen}
      >
        <div className="flex flex-col h-full py-4">
          {/* Header / Logo */}
          <div className="flex items-center justify-between px-6 mb-6">
            <button
              onClick={() => {
                navigate("/");
                onMobileClose();
              }}
              className="flex items-center gap-3 group outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg"
              aria-label="Fluxora home"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#00B8D4] to-[#0097A7] flex items-center justify-center text-white font-bold shadow-lg shadow-[#00B8D4]/20 group-hover:scale-105 transition-transform">
                F
              </div>
              <span
                className={cn(
                  "text-lg font-bold text-[var(--text)] transition-opacity duration-300",
                  collapsed ? "md:opacity-0 md:w-0" : "opacity-100"
                )}
              >
                Fluxora
              </span>
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onMobileClose}
              className="md:hidden p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>

          <div className="h-px bg-[var(--border)] mx-4 mb-4" />

          {/* Main Navigation */}
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onMobileClose}
                aria-current="page"
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all group outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                    isActive
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text)]"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active Indicator (Design Spec 4.2) */}
                    <div 
                      className={cn(
                        "absolute left-0 top-1 bottom-1 w-[3px] bg-[var(--accent)] rounded-r-full transition-opacity duration-200",
                        isActive ? "opacity-100" : "opacity-0"
                      )} 
                    />
                    <item.icon
                      size={20}
                      className={cn(
                        "flex-shrink-0 transition-colors",
                        isActive ? "text-[var(--accent)]" : "group-hover:text-[var(--text)]"
                      )}
                    />
                    <span
                      className={cn(
                        "transition-opacity duration-300 whitespace-nowrap",
                        collapsed ? "md:opacity-0 md:w-0" : "opacity-100"
                      )}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Utility / Bottom Links */}
          <div className="mt-auto px-3 space-y-1">
            <div className="h-px bg-[var(--border)] mx-1 my-4" />
            
            {utilityItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text)] transition-all group outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <item.icon size={20} className="flex-shrink-0 group-hover:text-[var(--text)]" />
                <span
                  className={cn(
                    "transition-opacity duration-300 whitespace-nowrap",
                    collapsed ? "md:opacity-0 md:w-0" : "opacity-100"
                  )}
                >
                  {item.label}
                </span>
              </a>
            ))}

            {/* Desktop Collapse Toggle */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex w-full items-center gap-3 px-3 py-3 mt-2 text-[var(--muted)] hover:text-[var(--accent)] transition-all group outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft
                size={20}
                className={cn(
                  "transition-transform duration-300",
                  collapsed ? "rotate-180" : "rotate-0"
                )}
              />
              <span
                className={cn(
                  "transition-opacity duration-300 font-medium",
                  collapsed ? "opacity-0 w-0" : "opacity-100"
                )}
              >
                Collapse
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
