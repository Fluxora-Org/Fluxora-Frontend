import { useWallet } from "./Walletcontext";
import { useI18n } from "../../i18n";
import "./wallet-connection-notice.css";

/**
 * Reports a dropped wallet connection (#1678).
 *
 * The live region is always mounted so assistive tech announces the change
 * when the message appears; it is visually empty while the connection is
 * healthy. The current view is never torn down — this notice only informs the
 * user and offers a manual retry while automatic recovery runs.
 */
export default function WalletConnectionNotice() {
  const { connectionStatus, reconnect } = useWallet();
  const { t } = useI18n();
  const dropped = connectionStatus === "dropped";
  const reconnecting = connectionStatus === "reconnecting";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("walletConnection.ariaLabel")}
      className="wallet-connection-notice"
      data-state={connectionStatus}
    >
      {(dropped || reconnecting) && (
        <div className="wallet-connection-notice__body">
          <span>
            {reconnecting
              ? t("walletConnection.reconnecting")
              : t("walletConnection.lost")}
          </span>
          {dropped && (
            <button
              type="button"
              className="wallet-connection-notice__action"
              onClick={() => {
                void reconnect();
              }}
            >
              {t("walletConnection.reconnectButton")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
