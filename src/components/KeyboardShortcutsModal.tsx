import { useState, useCallback, useMemo, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Monitor, Sun, Moon, Layout, Layers, Users, Wallet, Plus, FileText, Sparkles, X } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import { useWallet } from "./wallet-connect/Walletcontext";
import { useModalAccessibility } from "./useModalAccessibility";
import styles from "./KeyboardShortcutsModal.module.css";

type PaletteSection = "actions" | "shortcuts" | "help";

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  section: PaletteSection;
  icon?: React.ReactNode;
  shortcutLabel?: string;
  onActivate: () => void;
}

const SECTION_CONFIG: Record<PaletteSection, { label: string; icon: React.ReactNode }> = {
  actions: { label: "Actions", icon: <Sparkles size={12} /> },
  shortcuts: { label: "Shortcuts", icon: <Monitor size={12} /> },
  help: { label: "Help", icon: <FileText size={12} /> },
};

const SUGGESTIONS = [
  { label: "stream", action: "/app/streams" },
  { label: "theme", action: "toggle-theme" },
  { label: "shortcuts", action: "shortcuts-filter" },
  { label: "create", action: "/app/streams" },
  { label: "recipient", action: "/app/recipient" },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { connected } = useWallet();

  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsListRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useModalAccessibility({
    isOpen,
    onClose,
    modalRef: dialogRef as React.RefObject<HTMLElement>,
    initialFocusRef: searchInputRef as React.RefObject<HTMLElement>,
  });

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifierSymbol = isMac ? "⌘" : "Ctrl+";

  const navigateAndClose = useCallback(
    (path: string) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose],
  );

  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [
      {
        id: "nav-dashboard",
        label: "Dashboard",
        description: "Overview and metrics",
        section: "actions",
        icon: <Layout size={16} />,
        onActivate: () => navigateAndClose("/app"),
      },
      {
        id: "nav-streams",
        label: "Streams",
        description: "Create and manage streams",
        section: "actions",
        icon: <Layers size={16} />,
        onActivate: () => navigateAndClose("/app/streams"),
      },
      {
        id: "nav-recipient",
        label: "Recipient",
        description: "View incoming streams",
        section: "actions",
        icon: <Users size={16} />,
        onActivate: () => navigateAndClose("/app/recipient"),
      },
      {
        id: "nav-treasury",
        label: "Treasury",
        description: "Treasury overview",
        section: "actions",
        icon: <Wallet size={16} />,
        onActivate: () => navigateAndClose("/app/treasurypage"),
      },
      {
        id: "action-create-stream",
        label: "Create stream",
        description: "Start a new payment stream",
        section: "actions",
        icon: <Plus size={16} />,
        onActivate: () => navigateAndClose("/app/streams"),
      },
      {
        id: "action-toggle-theme",
        label: `Switch to ${theme === "light" ? "dark" : "light"} mode`,
        description: "Toggle between light and dark themes",
        section: "actions",
        icon: theme === "light" ? <Moon size={16} /> : <Sun size={16} />,
        onActivate: () => {
          toggleTheme();
          onClose();
        },
      },
      ...(!connected
        ? [
            {
              id: "action-connect-wallet",
              label: "Connect wallet",
              description: "Connect your Stellar wallet",
              section: "actions" as PaletteSection,
              icon: <Wallet size={16} />,
              onActivate: () => navigateAndClose("/connect-wallet"),
            },
          ]
        : []),
      {
        id: "shortcut-nav-1",
        label: "Go to Dashboard",
        section: "shortcuts" as PaletteSection,
        shortcutLabel: `${modifierSymbol}1`,
        onActivate: () => navigateAndClose("/app"),
      },
      {
        id: "shortcut-nav-2",
        label: "Go to Streams",
        section: "shortcuts" as PaletteSection,
        shortcutLabel: `${modifierSymbol}2`,
        onActivate: () => navigateAndClose("/app/streams"),
      },
      {
        id: "shortcut-nav-3",
        label: "Go to Recipient",
        section: "shortcuts" as PaletteSection,
        shortcutLabel: `${modifierSymbol}3`,
        onActivate: () => navigateAndClose("/app/recipient"),
      },
      {
        id: "shortcut-nav-4",
        label: "Go to Treasury",
        section: "shortcuts" as PaletteSection,
        shortcutLabel: `${modifierSymbol}4`,
        onActivate: () => navigateAndClose("/app/treasurypage"),
      },
      {
        id: "shortcut-palette",
        label: "Open command palette",
        section: "shortcuts" as PaletteSection,
        shortcutLabel: `${modifierSymbol}K`,
        onActivate: () => {},
      },
      {
        id: "shortcut-theme",
        label: "Toggle theme",
        section: "shortcuts" as PaletteSection,
        shortcutLabel: `T`,
        onActivate: () => {
          toggleTheme();
          onClose();
        },
      },
      {
        id: "help-create-stream",
        label: "How to create a stream?",
        description: "Step-by-step guide to creating your first payment stream",
        section: "help" as PaletteSection,
        icon: <FileText size={16} />,
        onActivate: () => navigateAndClose("/app/streams"),
      },
      {
        id: "help-recipient-view",
        label: "Understanding the recipient view",
        description: "How to review and manage incoming streams",
        section: "help" as PaletteSection,
        icon: <FileText size={16} />,
        onActivate: () => navigateAndClose("/app/recipient"),
      },
      {
        id: "help-treasury",
        label: "Treasury overview",
        description: "Understanding the treasury dashboard",
        section: "help" as PaletteSection,
        icon: <FileText size={16} />,
        onActivate: () => navigateAndClose("/app/treasurypage"),
      },
      {
        id: "help-connect-wallet",
        label: "Connecting your wallet",
        description: "How to connect Freighter, Albedo, or WalletConnect",
        section: "help" as PaletteSection,
        icon: <FileText size={16} />,
        onActivate: () => navigateAndClose("/connect-wallet"),
      },
      {
        id: "help-keyboard-shortcuts",
        label: "Keyboard shortcuts reference",
        description: "Browse all available keyboard shortcuts",
        section: "help" as PaletteSection,
        icon: <Monitor size={16} />,
        onActivate: () => {
          setQuery("shortcuts");
        },
      },
    ];
    return items;
  }, [theme, connected, modifierSymbol, navigateAndClose, toggleTheme, onClose]);

  const matchesQuery = useCallback(
    (item: PaletteItem, q: string): number => {
      if (!q) return -1;
      const label = item.label.toLowerCase();
      const desc = (item.description ?? "").toLowerCase();
      if (label === q) return 0;
      if (label.startsWith(q)) return 1;
      if (label.split(/\s+/).some((w) => w.startsWith(q))) return 2;
      if (label.includes(q)) return 3;
      if (desc.includes(q)) return 4;
      return -1;
    },
    [],
  );

  const flattenedResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return allItems.filter((item) => item.section === "actions");
    }
    const scored = allItems
      .map((item) => ({ item, score: matchesQuery(item, q) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        const order = { actions: 0, shortcuts: 1, help: 2 };
        return order[a.item.section] - order[b.item.section];
      })
      .map(({ item }) => item);
    return scored;
  }, [allItems, matchesQuery, query]);

  const groupedResults = useMemo(() => {
    const groups: { section: PaletteSection; items: PaletteItem[] }[] = [];
    const seen = new Set<PaletteSection>();
    for (const item of flattenedResults) {
      if (!seen.has(item.section)) {
        seen.add(item.section);
        groups.push({ section: item.section, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    }
    return groups;
  }, [flattenedResults]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (activeIndex >= flattenedResults.length) {
      setActiveIndex(Math.max(0, flattenedResults.length - 1));
    }
  }, [activeIndex, flattenedResults.length]);

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent | KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1 < flattenedResults.length ? prev + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : flattenedResults.length - 1));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (flattenedResults[activeIndex]) {
          flattenedResults[activeIndex].onActivate();
        }
        return;
      }
    },
    [flattenedResults, activeIndex],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => handleKeyDown(e);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (isOpen && resultsListRef.current && flattenedResults[activeIndex]) {
      const activeEl = resultsListRef.current.querySelector(
        `[data-index="${activeIndex}"]`,
      );
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen, activeIndex, flattenedResults]);

  const activeDescendantId =
    flattenedResults[activeIndex]?.id ?? undefined;

  const handleSuggestionClick = (term: string) => {
    setQuery(term);
    searchInputRef.current?.focus();
  };

  if (!isOpen) return null;

  const showKeyboardHint = query.trim() === "";

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={styles.dialog}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close command palette"
        >
          <X size={14} aria-hidden="true" />
        </button>

        <div className={styles.searchSection}>
          <div className={styles.searchInputWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              role="combobox"
              aria-expanded={flattenedResults.length > 0}
              aria-controls="palette-results"
              aria-activedescendant={activeDescendantId}
              aria-label="Search actions, shortcuts, and help articles"
              placeholder="Search actions, shortcuts, help..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.searchInput}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        {flattenedResults.length > 0 && (
          <div className={styles.resultsContainer} id="palette-results" role="listbox" aria-label="Results">
            {groupedResults.map((group) => (
              <div key={group.section} className={styles.section} role="presentation">
                <div className={styles.sectionHeader} role="presentation">
                  {SECTION_CONFIG[group.section].icon}
                  {SECTION_CONFIG[group.section].label}
                </div>
                <ul className={styles.sectionList} role="presentation">
                  {group.items.map((item) => {
                    const globalIndex = flattenedResults.indexOf(item);
                    return (
                      <li key={item.id} role="presentation">
                        <button
                          type="button"
                          role="option"
                          id={item.id}
                          data-index={globalIndex}
                          aria-selected={globalIndex === activeIndex}
                          className={`${styles.resultItem} ${globalIndex === activeIndex ? styles.active : ""}`}
                          onClick={() => {
                            item.onActivate();
                          }}
                          onMouseEnter={() => setActiveIndex(globalIndex)}
                        >
                          {item.icon && (
                            <span className={styles.resultItemIcon} aria-hidden="true">
                              {item.icon}
                            </span>
                          )}
                          <span className={styles.resultItemLabel}>
                            {item.label}
                          </span>
                          <span className={styles.resultItemMeta}>
                            {item.shortcutLabel && (
                              <kbd className={styles.shortcutBadge}>{item.shortcutLabel}</kbd>
                            )}
                            <ArrowRight size={14} className={styles.arrowHint} aria-hidden="true" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        {flattenedResults.length === 0 && query.trim() !== "" && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon} aria-hidden="true">
              <Search size={32} />
            </div>
            <p className={styles.emptyStateTitle}>No results for &ldquo;{query}&rdquo;</p>
            <p className={styles.emptyStateHint}>Try searching for something else:</p>
            <div className={styles.emptyStateSuggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className={styles.suggestionChip}
                  onClick={() => handleSuggestionClick(s.label)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {showKeyboardHint && (
          <div className={styles.keyboardHint}>
            <span>
              <kbd>&uarr;</kbd> <kbd>&darr;</kbd> Navigate
            </span>
            <span>
              <kbd>&#9166;</kbd> Select
            </span>
            <span>
              <kbd>Esc</kbd> Close
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
