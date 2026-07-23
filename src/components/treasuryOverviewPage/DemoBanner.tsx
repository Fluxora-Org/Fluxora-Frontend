export type DemoState = "loaded" | "empty" | "loading";

export interface DemoBannerProps {
  state: DemoState;
}

interface BadgeConfig {
  id: DemoState;
  label: string;
}

const BADGES: BadgeConfig[] = [
  { id: "loaded", label: "Loaded" },
  { id: "empty", label: "Empty" },
  { id: "loading", label: "Loading" },
];

export default function DemoBanner({ state }: DemoBannerProps) {
  return (
    <div
      className="rounded-lg px-4 py-3 border"
      style={{
        backgroundColor: "var(--color-warning-bg)",
        borderColor: "var(--color-warning)",
      }}
    >
      <div className="flex items-center gap-3 text-sm">
        <span
          className="font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          Demo state:
        </span>

        {BADGES.map((badge) => {
          const isActive = badge.id === state;
          return (
            <span
              key={badge.id}
              data-testid={`badge-${badge.id}`}
              data-active={isActive}
              className="px-2 py-1 rounded border text-xs transition-colors"
              style={
                isActive
                  ? {
                      backgroundColor: "var(--color-warning)",
                      color: "var(--color-text-inverse)",
                      borderColor: "var(--color-warning)",
                      fontWeight: 600,
                    }
                  : {
                      backgroundColor: "transparent",
                      color: "var(--color-text-muted)",
                      borderColor: "var(--color-border-default)",
                      fontWeight: 400,
                    }
              }
            >
              {badge.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}