import { useRef } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemePreference } from "../../theme/ThemeProvider";

export default function ThemeSegmentedControl() {
  const { theme, themePreference, setThemePreference } = useTheme();

  const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "auto", label: "Auto", icon: Monitor },
  ];

  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % options.length;
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + options.length) % options.length;
      e.preventDefault();
    } else {
      return;
    }

    const nextValue = options[nextIndex].value;
    setThemePreference(nextValue);

    // Wait for state transition to complete, then focus
    setTimeout(() => {
      buttonRefs.current[nextIndex]?.focus();
    }, 0);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme preference"
      className="flex items-center gap-1.5"
    >
      {options.map((opt, idx) => {
        const Icon = opt.icon;
        const isSelected = themePreference === opt.value;
        const ariaLabel =
          opt.value === "auto" ? `Auto (currently ${theme})` : opt.label;

        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            role="radio"
            aria-checked={isSelected}
            aria-label={ariaLabel}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => setThemePreference(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-3 md:px-4 rounded-full border transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              isSelected
                ? "border-[var(--color-accent-primary)] text-[var(--color-accent-primary)] bg-[var(--color-surface-elevated)]"
                : "border-[var(--navbar-icon-border)] text-[var(--navbar-icon-color)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] bg-transparent"
            }`}
          >
            <Icon className="icon-xs" aria-hidden="true" />
            <span className="sr-only md:not-sr-only font-sans text-xs font-semibold">
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
