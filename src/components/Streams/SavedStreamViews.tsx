import Input from "../Input";
import { useState } from "react";
import { useI18n } from "../../i18n";
import { useLiveAnnouncer } from "../../hooks/useLiveAnnouncer";
import {
  deleteStreamView,
  MAX_SAVED_STREAM_VIEW_NAME,
  readSavedStreamViews,
  saveStreamView,
} from "../../lib/savedStreamViews";
import {
  parseStreamRouteFilters,
  type StreamRouteFilters,
} from "../../lib/streamFilterParams";

export interface SavedStreamViewsProps {
  account: string;
  filters: StreamRouteFilters;
  onApply: (filters: StreamRouteFilters) => void;
  onInteraction: () => void;
}

export function SavedStreamViews({
  account,
  filters,
  onApply,
  onInteraction,
}: SavedStreamViewsProps) {
  const { t } = useI18n();
  const { announcement, alertAnnouncement, announce, announceAlert } =
    useLiveAnnouncer();
  const [views, setViews] = useState(() => readSavedStreamViews(account));
  const [name, setName] = useState("");
  return (
    <section className="stream-panel" aria-label={t("streams.views.title")}>
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onInteraction();
          if (!saveStreamView(account, name, filters)) {
            announceAlert(t("streams.views.saveError"));
            return;
          }
          setViews(readSavedStreamViews(account));
          setName("");
          announce(t("streams.views.saved"));
        }}
      >
        <label htmlFor="stream-view-name">{t("streams.views.name")}</label>
        <Input
          id="stream-view-name"
          value={name}
          maxLength={MAX_SAVED_STREAM_VIEW_NAME}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          type="submit"
          className="streams-secondary-button"
          disabled={!account || !name.trim()}
        >
          {t("streams.views.save")}
        </button>
      </form>
      <ul className="flex flex-wrap gap-3 mt-3">
        {views.map((view) => (
          <li key={view.name} className="flex items-center gap-2">
            <button
              type="button"
              className="streams-secondary-button"
              aria-label={t("streams.views.applyName", { name: view.name })}
              onClick={() => {
                onInteraction();
                onApply(parseStreamRouteFilters(view.query));
                announce(t("streams.views.applied"));
              }}
            >
              {view.name}
            </button>
            <button
              type="button"
              className="streams-ghost-button"
              aria-label={t("streams.views.deleteName", { name: view.name })}
              onClick={() => {
                onInteraction();
                if (!deleteStreamView(account, view.name)) {
                  announceAlert(t("streams.views.deleteError"));
                  return;
                }
                setViews(readSavedStreamViews(account));
                announce(t("streams.views.deleted"));
              }}
            >
              {t("streams.views.delete")}
            </button>
          </li>
        ))}
      </ul>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <div className="sr-only" role="alert">
        {alertAnnouncement}
      </div>
    </section>
  );
}
