import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export type CreateStreamFabAction = {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: "upload" | "plus";
};

type CreateStreamFabProps = {
  onCreateStream: () => void;
  disabled?: boolean;
  hidden?: boolean;
  actions?: CreateStreamFabAction[];
};

function PlusIcon({ rotated = false }: { rotated?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={
        rotated
          ? "create-stream-fab__icon is-rotated"
          : "create-stream-fab__icon"
      }
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      className="create-stream-fab__menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4m0 0-4 4m4-4 4 4M5 14v5h14v-5" />
    </svg>
  );
}

/** Persistent create entry point for long authenticated pages. */
export default function CreateStreamFab({
  onCreateStream,
  disabled = false,
  hidden = false,
  actions = [],
}: CreateStreamFabProps) {
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasActions = actions.length > 0;

  useEffect(() => {
    if (hidden || disabled) setExpanded(false);
  }, [disabled, hidden]);

  useEffect(() => {
    if (!expanded || !hasActions) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("[role=menuitem]")
      ?.focus();
  }, [expanded, hasActions]);

  if (hidden) return null;

  const handleMainClick = () => {
    if (hasActions) {
      setExpanded((value) => !value);
    } else {
      onCreateStream();
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ??
        [],
    );
    const currentIndex = items.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    let nextIndex = currentIndex;

    if (event.key === "ArrowDown")
      nextIndex = (currentIndex + 1) % items.length;
    if (event.key === "ArrowUp")
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (event.key === "Escape") {
      setExpanded(false);
      return;
    }

    if (nextIndex !== currentIndex && items[nextIndex]) {
      event.preventDefault();
      items[nextIndex].focus();
    }
  };

  return (
    <div className="create-stream-fab" data-expanded={expanded || undefined}>
      {expanded && hasActions ? (
        <div
          ref={menuRef}
          id="create-stream-fab-menu"
          className="create-stream-fab__menu"
          role="menu"
          aria-label="Create stream actions"
          onKeyDown={handleMenuKeyDown}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="create-stream-fab__menu-item"
              role="menuitem"
              onClick={() => {
                action.onSelect();
                setExpanded(false);
              }}
            >
              {action.icon === "upload" ? <UploadIcon /> : <PlusIcon />}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="ui-primary-cta create-stream-fab__button"
        onClick={handleMainClick}
        disabled={disabled}
        aria-label={
          disabled ? "Create stream (connect wallet first)" : "Create stream"
        }
        aria-haspopup={hasActions ? "menu" : undefined}
        aria-expanded={hasActions ? expanded : undefined}
        aria-controls={hasActions ? "create-stream-fab-menu" : undefined}
        title={disabled ? "Connect wallet to create a stream" : "Create stream"}
      >
        <PlusIcon rotated={expanded} />
        <span className="create-stream-fab__label">
          {expanded ? "Close" : "Create stream"}
        </span>
      </button>
    </div>
  );
}
