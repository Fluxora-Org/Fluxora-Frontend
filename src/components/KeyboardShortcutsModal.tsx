/**
 * Unified Command Palette & Help Search Modal (Cmd/Ctrl+K / ?)
 * ─────────────────────────────────────────────────────────────
 * Combines global action search, keyboard shortcut references, and lightweight
 * help-article search in one accessible interface.
 *
 * Supersedes legacy KeyboardShortcutsModal while preserving backwards
 * compatibility.
 *
 * Accessibility guarantees (WCAG 2.1 AA + Issue #1656):
 * - Single-key shortcuts are disabled when a screen reader is detected or the
 *   user has opted out (persisted in localStorage).
 * - Shortcuts never fire while keyboard focus is inside a text field.
 * - Shortcuts never fire during IME composition.
 * - Modifier-key combinations are always guarded before single-key shortcuts.
 * - The shortcut list is discoverable via a visible "Keyboard shortcuts" help
 *   button exported as `ShortcutsHelpButton`.
 * - Users can toggle shortcuts off/on from within the modal footer.
 * - ARIA listbox/option pattern with aria-activedescendant & aria-selected.
 * - Live announcements via polite aria-live region.
 * - Full focus trap & scroll lock via useModalAccessibility.
 * - Text contrast >= 4.5:1 and non-text focus boundary >= 3:1 in both themes.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Zap,
  BookOpen,
  Keyboard as KeyboardIcon,
  CornerDownLeft,
} from 'lucide-react';
import { useModalAccessibility } from './useModalAccessibility';
import { useTheme } from '../theme/ThemeProvider';
import {
  PALETTE_ITEMS,
  PaletteItem,
  PaletteCategory,
} from './commandPaletteData';
import { clsx } from 'clsx';
import {
  useKeyboardShortcuts,
  isTextFieldTarget,
} from '../hooks/useKeyboardShortcuts';

// ─── CommandPaletteModal ──────────────────────────────────────────────────────

export function CommandPaletteModal() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Assistive-technology safety ───────────────────────────────────────────
  // useKeyboardShortcuts enforces all guards: screen reader detection,
  // text-field focus, IME composition, and user disable preference.
  const { shortcutsDisabled, userDisabled, toggleShortcuts, screenReaderDetected } =
    useKeyboardShortcuts(
      [
        {
          key: '?',
          onTrigger: () => setOpen(true),
          skipWhen: () => open,
        },
        {
          key: 'Escape',
          onTrigger: () => setOpen(false),
          skipWhen: () => !open,
        },
      ],
    );

  // ── Additional openers: Cmd/Ctrl+K and CustomEvent ───────────────────────
  // These are modifier-key combos or programmatic events — not single-key
  // shortcuts — so they are NOT suppressed by the AT guards.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function handleCustomEvent() {
      setOpen(true);
    }
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomEvent);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomEvent);
    };
  }, []);

  // Focus trap & modal accessibility
  useModalAccessibility({
    isOpen: open,
    modalRef: dialogRef,
    initialFocusRef: inputRef,
    onClose: () => setOpen(false),
  });

  // ── Search / filter logic ─────────────────────────────────────────────────
  const { flatResults, groupedResults } = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();

    const filtered = lowerQuery
      ? PALETTE_ITEMS.filter(
          (item) =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.description.toLowerCase().includes(lowerQuery) ||
            item.keywords.some((k) => k.toLowerCase().includes(lowerQuery)),
        )
      : PALETTE_ITEMS;

    const grouped: Record<PaletteCategory, PaletteItem[]> = {
      Actions: [],
      Shortcuts: [],
      Help: [],
    };
    for (const item of filtered) {
      grouped[item.category].push(item);
    }

    return { flatResults: filtered, groupedResults: grouped };
  }, [query]);

  // Reset focused index when results change
  useEffect(() => {
    setFocusedIndex(0);
  }, [query]);

  // ── Item selection ────────────────────────────────────────────────────────
  const handleSelectItem = useCallback(
    (item: PaletteItem) => {
      if (item.actionId === 'toggle-theme') {
        toggleTheme();
        setOpen(false);
        return;
      }
      if (item.targetPath) {
        navigate(item.targetPath);
        setOpen(false);
        return;
      }
      // Shortcut / help items without a target just close the palette.
      setOpen(false);
    },
    [navigate, toggleTheme],
  );

  // ── Keyboard navigation inside the input ─────────────────────────────────
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = flatResults[focusedIndex];
        if (item) handleSelectItem(item);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [flatResults, focusedIndex, handleSelectItem],
  );

  const currentFocusedItem = flatResults[focusedIndex] ?? null;

  // ── Render ────────────────────────────────────────────────────────────────
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts and Command Palette"
      data-testid="command-palette-modal"
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'w-full bg-[var(--surface-base)] border border-[var(--border-strong)] shadow-2xl overflow-hidden flex flex-col transition-all duration-200',
          // Responsive: bottom sheet on mobile, centered modal on desktop
          'max-md:mt-auto max-md:rounded-t-2xl max-md:max-h-[90vh]',
          'md:max-w-2xl md:rounded-2xl md:max-h-[75vh] md:my-auto',
        )}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-neutral)] bg-[var(--surface-sunken)]">
          <Search
            size={20}
            className="text-[var(--text-muted)] flex-shrink-0"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-haspopup="listbox"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocusedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search actions, shortcuts, or help articles..."
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={
              currentFocusedItem ? currentFocusedItem.id : undefined
            }
            className="flex-1 bg-transparent text-sm sm:text-base text-[var(--text-vivid)] placeholder:[var(--text-muted)] outline-none border-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-vivid)] transition-colors"
              aria-label="Clear search query"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-2 py-1 text-xs rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-vivid)] transition-colors"
            aria-label="Close command palette"
          >
            Esc
          </button>
        </div>

        {/* Screen reader / disabled notice */}
        {shortcutsDisabled && (
          <div
            role="status"
            aria-live="polite"
            className="px-4 py-2 text-xs text-[var(--text-muted)] bg-[var(--surface-elevated)] border-b border-[var(--border-neutral)] flex items-center gap-2"
            data-testid="shortcuts-disabled-notice"
          >
            <KeyboardIcon size={13} aria-hidden="true" />
            {screenReaderDetected
              ? 'Keyboard shortcuts are disabled because a screen reader is detected. You can still use this palette.'
              : 'Keyboard shortcuts are currently disabled. You can re-enable them below.'}
          </div>
        )}

        {/* ARIA Live Region for Search Results Count */}
        <div
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
          data-testid="live-region"
        >
          {flatResults.length === 0
            ? `No results found for ${query}`
            : `${flatResults.length} command options available.`}
        </div>

        {/* Results Area */}
        <div
          id="command-palette-results"
          role="listbox"
          aria-label="Command palette search results"
          className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-4 max-h-[60vh]"
        >
          {/* Empty Query State */}
          {!query && (
            <div className="px-3 pt-1 pb-2 flex items-center gap-2 text-xs font-semibold text-[var(--color-accent-primary)] uppercase tracking-wider">
              <Sparkles size={14} aria-hidden="true" />
              <span>Suggested &amp; Frequent Actions</span>
            </div>
          )}

          {/* No Results State */}
          {flatResults.length === 0 && (
            <div className="py-12 px-6 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--surface-elevated)] text-[var(--text-muted)] flex items-center justify-center">
                <HelpCircle size={24} aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[var(--text-vivid)]">
                  No matching results found
                </h4>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  No actions, shortcuts, or help articles matched &ldquo;
                  {query}&rdquo;. Try searching for{' '}
                  <span className="text-[var(--color-accent-primary)]">
                    &ldquo;streams&rdquo;
                  </span>
                  ,{' '}
                  <span className="text-[var(--color-accent-primary)]">
                    &ldquo;create&rdquo;
                  </span>
                  , or{' '}
                  <span className="text-[var(--color-accent-primary)]">
                    &ldquo;withdraw&rdquo;
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Grouped Category Sections */}
          {(['Actions', 'Shortcuts', 'Help'] as PaletteCategory[]).map(
            (category) => {
              const items = groupedResults[category];
              if (!items || items.length === 0) return null;

              const CategoryIcon =
                category === 'Actions'
                  ? Zap
                  : category === 'Shortcuts'
                    ? KeyboardIcon
                    : BookOpen;

              return (
                <div key={category} className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <CategoryIcon
                      size={13}
                      className="text-[var(--color-accent-primary)]"
                      aria-hidden="true"
                    />
                    <span>{category}</span>
                  </div>

                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const globalIndex = flatResults.findIndex(
                        (r) => r.id === item.id,
                      );
                      const isFocused = globalIndex === focusedIndex;

                      return (
                        <div
                          key={item.id}
                          id={item.id}
                          role="option"
                          aria-selected={isFocused}
                          tabIndex={isFocused ? 0 : -1}
                          onClick={() => handleSelectItem(item)}
                          onMouseEnter={() => setFocusedIndex(globalIndex)}
                          className={clsx(
                            'group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border',
                            isFocused
                              ? 'bg-[var(--color-accent-primary)]/10 border-[var(--color-accent-primary)] text-[var(--text-vivid)] shadow-sm'
                              : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]',
                          )}
                        >
                          {/* Active Selection Indicator */}
                          {isFocused && (
                            <div
                              className="absolute left-0 top-2 bottom-2 w-1 bg-[var(--color-accent-primary)] rounded-r-full"
                              aria-hidden="true"
                            />
                          )}

                          <div className="flex flex-col gap-0.5 pr-4 pl-1">
                            <span className="text-sm font-semibold text-[var(--text-vivid)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                              {item.title}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] line-clamp-1">
                              {item.description}
                            </span>
                          </div>

                          {/* Right: Shortcut Keys or Arrow */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {item.shortcutKeys && item.shortcutKeys.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {item.shortcutKeys.map((key) => (
                                  <kbd
                                    key={key}
                                    className="min-w-[20px] h-5 px-1.5 rounded bg-[var(--surface-raised)] border border-[var(--border-neutral)] text-[11px] font-mono font-bold text-[var(--text-vivid)] flex items-center justify-center shadow-xs"
                                  >
                                    {key}
                                  </kbd>
                                ))}
                              </div>
                            ) : (
                              <ArrowRight
                                size={16}
                                className={clsx(
                                  'transition-transform',
                                  isFocused
                                    ? 'text-[var(--color-accent-primary)] translate-x-0.5'
                                    : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100',
                                )}
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            },
          )}
        </div>

        {/* Footer: Navigation hints + disable-shortcuts toggle */}
        <div className="px-4 py-2.5 border-t border-[var(--border-neutral)] bg-[var(--surface-sunken)] flex items-center justify-between gap-4 text-[11px] text-[var(--text-muted)] flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] font-mono text-[10px]">
                ↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] font-mono text-[10px]">
                <CornerDownLeft size={10} aria-hidden="true" />
              </kbd>
              <span>Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] font-mono text-[10px]">
                Esc
              </kbd>
              <span>Exit</span>
            </span>
          </div>

          {/* Disable / re-enable shortcuts toggle */}
          <button
            type="button"
            onClick={toggleShortcuts}
            aria-pressed={userDisabled}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--border)] hover:bg-[var(--surface-elevated)] transition-colors text-[11px]"
            data-testid="toggle-shortcuts-btn"
          >
            <KeyboardIcon size={12} aria-hidden="true" />
            {userDisabled ? 'Enable shortcuts' : 'Disable shortcuts'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ShortcutsHelpButton ──────────────────────────────────────────────────────
/**
 * A discoverable help button that opens the Command Palette / Keyboard
 * Shortcuts modal.  Mount this in a Navbar, toolbar, or any persistent chrome
 * so users can always reach the shortcut list without knowing the `?` key.
 *
 * Satisfaction of acceptance criterion 3: "The shortcut list is discoverable."
 */
export function ShortcutsHelpButton({
  className,
  onOpen,
}: {
  className?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Open keyboard shortcuts and command palette"
      title="Keyboard shortcuts (?)"
      onClick={onOpen}
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-vivid)] hover:bg-[var(--surface-elevated)] transition-colors text-xs',
        className,
      )}
      data-testid="shortcuts-help-button"
    >
      <KeyboardIcon size={14} aria-hidden="true" />
      <span>Shortcuts</span>
    </button>
  );
}

// ─── Backwards compatibility ──────────────────────────────────────────────────
/**
 * KeyboardShortcutsModal: backwards-compatible re-export of CommandPaletteModal.
 */
export function KeyboardShortcutsModal() {
  return <CommandPaletteModal />;
}
