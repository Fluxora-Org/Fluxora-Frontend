import { Metric } from "./Metric";
import { Plus } from "lucide-react";
import React from "react";

interface WidgetTrayProps {
  hiddenWidgets: { metric: Metric; id: string }[];
  onRestore: (id: string) => void;
  onResetAll?: () => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDragEnter?: (e: React.DragEvent, id: string) => void;
  onDragLeave?: (e: React.DragEvent, id: string) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
  invalidDragOverId?: string | null;
}

export default function WidgetTray({
  hiddenWidgets,
  onRestore,
  onResetAll,
  onDragOver = () => {},
  onDragEnter = () => {},
  onDragLeave = () => {},
  onDrop = () => {},
  invalidDragOverId = null,
}: WidgetTrayProps) {
  return (
    <section
      aria-label="Add widgets"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-xl)",
        marginTop: "var(--space-xl)",
        transition: "all var(--transition-base)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: hiddenWidgets.length > 0 ? "var(--space-lg)" : "0px",
        }}
      >
        <div>
          <h3
            style={{
              font: "var(--font-heading-4)",
              color: "var(--color-text-primary)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
            }}
          >
            Customize Dashboard Widgets
          </h3>
          <p
            style={{
              font: "var(--font-body-sm)",
              color: "var(--color-text-secondary)",
              margin: "var(--space-xs) 0 0 0",
            }}
          >
            {hiddenWidgets.length > 0
              ? "Select which metrics are displayed on your treasury grid."
              : "All metrics are currently active on your dashboard."}
          </p>
        </div>
        {onResetAll && (
          <button
            onClick={onResetAll}
            className="ui-secondary-control"
            style={{
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: "var(--radius-md)",
              font: "var(--font-label-sm)",
              cursor: "pointer",
              backgroundColor: "var(--color-surface-default)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-secondary)",
              transition: "all var(--transition-fast)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "var(--interactive-bg-hover)";
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-surface-default)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            Reset Layout
          </button>
        )}
      </div>

      {hiddenWidgets.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-md)",
          }}
        >
          {hiddenWidgets.map(({ metric, id }) => {
            const isInvalidDragOver = invalidDragOverId === id;
            return (
              <div
                key={id}
                onDragOver={(e) => onDragOver(e, id)}
                onDragEnter={(e) => onDragEnter(e, id)}
                onDragLeave={(e) => onDragLeave(e, id)}
                onDrop={(e) => onDrop(e, id)}
                className={isInvalidDragOver ? "widget-drop-invalid" : ""}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  backgroundColor: "var(--color-surface-default)",
                  border: "1px solid var(--color-border-default)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-sm) var(--space-md)",
                  boxShadow: "var(--shadow-sm)",
                  transition: "all var(--transition-base)",
                }}
              >
                <span style={{ fontSize: "1.5rem", userSelect: "none" }}>{metric.icon}</span>
                <span
                  style={{
                    font: "var(--font-label-md)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {metric.label}
                </span>
                <button
                  onClick={() => onRestore(id)}
                  aria-label={`Restore ${metric.label} widget`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-xs)",
                    padding: "var(--space-xs) var(--space-sm)",
                    backgroundColor: "var(--color-accent-primary)",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-text-inverse)",
                    cursor: "pointer",
                    font: "var(--font-label-sm)",
                    fontWeight: 600,
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-accent-primary-dark)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-accent-primary)";
                  }}
                >
                  <Plus size={14} aria-hidden="true" />
                  Add
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
