import { useEffect, useRef, useState } from "react";
import { useTickingNow } from "../../hooks/useTickingNow";
import {
  formatNavbarTime,
  formatLocalISOWithOffset,
  getFormattedUTCOffset,
} from "../../lib/timePresentation";

const TOOLTIP_ID = "navbar-time-tooltip";

interface ResolvedTimezone {
  timezone: string;
  isFallback: boolean;
}

function resolveTimezone(): ResolvedTimezone {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (
      typeof timezone !== "string" ||
      !timezone.trim() ||
      timezone.toLowerCase() === "etc/unknown"
    ) {
      return { timezone: "UTC", isFallback: true };
    }
    return { timezone, isFallback: false };
  } catch {
    return { timezone: "UTC", isFallback: true };
  }
}

export function TimezoneIndicator() {
  const [manualTime, setManualTime] = useState<Date | null>(null);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tickingNow = useTickingNow({ precision: "minute" });
  const { timezone, isFallback } = resolveTimezone();
  const displayTime = manualTime ?? new Date(tickingNow);
  const compactTime = formatNavbarTime(displayTime, {
    compact: true,
    timezone,
  });
  const desktopText = isFallback
    ? `UTC: ${compactTime}`
    : `Local: ${formatNavbarTime(displayTime, { timezone })}`;

  useEffect(() => {
    setManualTime(null);
  }, [tickingNow]);

  const refreshTime = () => setManualTime(new Date());
  const handleMouseLeave = () => {
    if (triggerRef.current !== document.activeElement) {
      setIsTooltipOpen(false);
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsTooltipOpen(true)}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={triggerRef}
        id="navbar-time-trigger"
        type="button"
        onFocus={() => {
          refreshTime();
          setIsTooltipOpen(true);
        }}
        onBlur={() => {
          setIsTooltipOpen(false);
          setManualTime(null);
        }}
        onClick={() => {
          refreshTime();
          setIsTooltipOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsTooltipOpen(false);
        }}
        aria-label={`Current time: ${desktopText}. Click or focus for details.`}
        aria-expanded={isTooltipOpen}
        aria-describedby={TOOLTIP_ID}
        className="px-3 min-h-[44px] rounded-full border border-[var(--navbar-icon-border)] hover:border-[var(--accent)]/50 text-[var(--color-text-secondary)] hover:text-[var(--accent)] bg-transparent hover:bg-[var(--surface-elevated)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] flex items-center justify-center cursor-pointer select-none"
      >
        <span
          aria-live="off"
          className="hidden md:inline font-sans text-xs font-semibold"
        >
          {desktopText}
        </span>
        <span
          aria-live="off"
          className="md:hidden font-sans text-xs font-semibold"
        >
          {compactTime}
        </span>
      </button>

      <div
        id={TOOLTIP_ID}
        role="tooltip"
        hidden={!isTooltipOpen}
        className={`absolute right-0 mt-2 p-4 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-[var(--tooltip-bg,var(--surface-elevated))] border border-[var(--tooltip-border,var(--border-neutral))] shadow-[var(--tooltip-shadow)] text-[var(--tooltip-text-color,var(--text-secondary))] font-mono text-xs z-[1100] flex flex-col gap-2.5 ${
          isTooltipOpen ? "flex" : "hidden"
        }`}
      >
        <div className="font-semibold text-[var(--tooltip-title-color,var(--text-vivid))] border-b border-[var(--navbar-border)] pb-1.5 flex items-center justify-between">
          <span>Time Details</span>
          {isFallback && (
            <span className="text-[10px] text-amber-400 font-sans px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
              Fallback
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-sans font-medium">
              ISO Timestamp
            </span>
            <span className="text-[var(--text-vivid)] select-all break-all">
              {formatLocalISOWithOffset(displayTime, timezone)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-sans font-medium">
              Resolved Timezone
            </span>
            <span className="text-[var(--text-vivid)]">{timezone}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-sans font-medium">
              UTC Offset
            </span>
            <span className="text-[var(--text-vivid)]">
              {getFormattedUTCOffset(displayTime, timezone)}
            </span>
          </div>
          {isFallback && (
            <div className="mt-1 pt-1.5 border-t border-[var(--navbar-border)] text-[10px] text-amber-400 font-sans italic">
              Timezone detection unavailable. Using UTC fallback.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TimezoneIndicator;
