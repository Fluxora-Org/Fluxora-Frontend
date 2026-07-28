import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../i18n";
import {
  useNetworkStatus,
  type UseNetworkStatusValue,
} from "../hooks/useNetworkStatus";
import "./NetworkStatusBanner.css";

/**
 * Visual tones per state — kept as a const map so CSS can switch on
 * `data-state` without conditional class composition and so designers
 * can audit the gradient at a glance.
 */
const STATE_TONE: Record<
  Exclude<UseNetworkStatusValue, "online-nominal">,
  "info" | "warning" | "error" | "success"
> = {
  slow: "info",
  offline: "error",
  reconnecting: "warning",
  "reconnected-confirmation": "success",
};

const COPY: Record<
  Exclude<UseNetworkStatusValue, "online-nominal">,
  { titleKey: string; bodyKey: string }
> = {
  slow: {
    titleKey: "network.banner.slow.title",
    bodyKey: "network.banner.slow.body",
  },
  offline: {
    titleKey: "network.banner.offline.title",
    bodyKey: "network.banner.offline.body",
  },
  reconnecting: {
    titleKey: "network.banner.reconnecting.title",
    bodyKey: "network.banner.reconnecting.body",
  },
  "reconnected-confirmation": {
    titleKey: "network.banner.reconnectedPill.title",
    bodyKey: "network.banner.reconnectedPill.body",
  },
};

const ICON_BY_TONE: Record<"info" | "warning" | "error" | "success", string> = {
  info: "⏱",
  warning: "↻",
  success: "✓",
  error: "⚠",
};

interface NetworkStatusBannerProps {
  /**
   * Override the hook result so tests can drive transitions deterministically.
   * Default: {@link useNetworkStatus}.
   */
  status?: UseNetworkStatusValue | null;
  onDismissPill?: () => void;
}

const DEFAULT_PROPS: Partial<NetworkStatusBannerProps> = {};

/**
 * App-wide network-status banner — mounts in `src/components/Layout.tsx`
 * above `<main>` so it never traps focus and the existing skip-link still
 * bypasses it.
 *
 * The component is **presentational**: it owns the icon copy and the
 * pill close button only; the state machine lives in
 * `src/hooks/useNetworkStatus.ts` and the data layer in
 * `src/lib/networkStatus.ts`.
 */
export default function NetworkStatusBanner(
  props: NetworkStatusBannerProps = DEFAULT_PROPS,
) {
  const live = useNetworkStatus();
  const status = (props.status ?? live.status) as UseNetworkStatusValue;
  const { t } = useI18n();
  const [pillDismissed, setPillDismissed] = useState(false);

  // Reset local dismissal whenever the pill re-appears so the user can
  // always dismiss a fresh confirmation.
  useEffect(() => {
    if (status === "reconnected-confirmation") setPillDismissed(false);
  }, [status]);

  const dismissPill = useCallback(() => {
    setPillDismissed(true);
    props.onDismissPill?.();
  }, [props]);

  // All const declarations that drive the JSX must be defined *before*
  // any conditional `return null`, both to satisfy Rules of Hooks and
  // to keep the JSX reference graph complete.
  const isPill = status === "reconnected-confirmation";
  const isOffline = status === "offline";

  // Mirror the original early-return: banner is hidden in the healthy
  // nominal state.
  if (status === "online-nominal") return null;

  const tone = STATE_TONE[status as keyof typeof STATE_TONE];
  const copy = COPY[status as keyof typeof COPY];
  const title = t(copy.titleKey);
  const body = t(copy.bodyKey);
  const ariaRole = isOffline ? "alert" : "status";
  const ariaLive = isOffline ? "assertive" : "polite";

  // Local pill dismissal: once the user dismisses a confirmation pill we
  // unmount it locally without changing the upstream status. The next
  // re-occurrence (`useEffect` above) clears the dismissal flag.
  if (isPill && pillDismissed) return null;

  return (
    <aside
      className="network-status-banner"
      data-state={status}
      data-tone={tone}
      data-variant={isPill ? "pill" : "expanded"}
      role={ariaRole}
      aria-live={ariaLive}
      aria-atomic="true"
      aria-label={`${title}. ${body}`}
    >
      <span className="network-status-banner__icon" aria-hidden="true">
        {ICON_BY_TONE[tone]}
      </span>
      <span className="network-status-banner__copy">
        <span className="network-status-banner__title">{title}</span>
        {!isPill && (
          <span className="network-status-banner__body">{body}</span>
        )}
      </span>
      {isPill && (
        <button
          type="button"
          className="network-status-banner__dismiss"
          onClick={dismissPill}
          aria-label={t("network.banner.pillDismissAria")}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </aside>
  );
}
