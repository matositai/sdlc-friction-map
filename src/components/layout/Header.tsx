"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
  liveMode?: boolean;
  isLive?: boolean;
  criticalCount?: number;
}

export function Header({ title, subtitle, liveMode = false, isLive, criticalCount }: HeaderProps) {
  const showLive = isLive ?? liveMode;

  return (
    <header
      className="h-14 flex items-center justify-between px-6 sticky top-0 z-20 backdrop-blur-md"
      style={{
        backgroundColor: "rgba(12,14,17,0.85)",
        borderBottom: "1px solid var(--nc-ghost)",
      }}
    >
      <div>
        <h1
          className="font-heading font-semibold text-base leading-tight tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {criticalCount != null && criticalCount > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded"
            style={{ backgroundColor: "rgba(255,113,108,0.12)", border: "1px solid rgba(255,113,108,0.25)" }}
          >
            <span
              className="w-1.5 h-1 rounded-sm animate-pulse"
              style={{ backgroundColor: "var(--nc-error)" }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--nc-error)" }}>
              {criticalCount} critical friction
            </span>
          </div>
        )}

        {showLive ? (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: "rgba(0,255,163,0.1)",
              border: "1px solid rgba(0,255,163,0.2)",
              color: "var(--nc-mint)",
            }}
          >
            <span
              className="w-1.5 h-1 rounded-sm animate-pulse"
              style={{ backgroundColor: "var(--nc-mint)" }}
            />
            Live · GitHub
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs"
            style={{
              backgroundColor: "var(--nc-surface-2)",
              border: "1px solid var(--nc-ghost)",
              color: "var(--muted-foreground)",
            }}
          >
            Mock Data
          </div>
        )}

        <div className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          Updated just now
        </div>
      </div>
    </header>
  );
}
