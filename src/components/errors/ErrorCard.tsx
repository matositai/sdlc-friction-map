interface ErrorCardProps {
  icon?: string;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "error" | "warning" | "info";
}

export function ErrorCard({ icon = "⚠️", title, message, action, variant = "error" }: ErrorCardProps) {
  const borderColor = variant === "error" ? "#ff716c" : variant === "warning" ? "#ffc965" : "#69daff";
  const bgColor = variant === "error" ? "rgba(255,113,108,0.08)" : variant === "warning" ? "rgba(255,201,101,0.08)" : "rgba(105,218,255,0.08)";

  return (
    <div className="rounded-lg p-4 border" style={{ backgroundColor: bgColor, borderColor }}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--foreground)" }}>
            {title}
          </h3>
          <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
            {message}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="text-xs px-2 py-1 rounded font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: borderColor,
                color: variant === "error" || variant === "info" ? "var(--nc-void)" : "var(--nc-void)",
              }}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
