"use client";

import { useEffect, useState } from "react";
import type { RateLimitResponse } from "@/app/api/rate-limit/route";

export function RateLimitWidget() {
  const [data, setData] = useState<RateLimitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetCountdown, setResetCountdown] = useState<number | null>(null);

  useEffect(() => {
    const fetchRateLimit = async () => {
      try {
        const res = await fetch("/api/rate-limit");
        if (!res.ok) {
          setError("Failed to load rate limit status");
          return;
        }
        const json = (await res.json()) as RateLimitResponse;
        setData(json);
        setResetCountdown(json.resetInMinutes);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      }
    };

    fetchRateLimit();

    // Update countdown every minute
    const interval = setInterval(() => {
      setResetCountdown((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div
        className="rounded-lg p-4 border mb-5"
        style={{
          backgroundColor: "rgba(255,113,108,0.08)",
          borderColor: "#ff716c",
        }}
      >
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="rounded-lg p-4 border mb-5"
        style={{
          backgroundColor: "rgba(105,218,255,0.08)",
          borderColor: "rgba(105,218,255,0.2)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Loading rate limit status...
        </p>
      </div>
    );
  }

  const percentRemaining = (data.remaining / data.limit) * 100;
  let barColor = "#00ffa3"; // green
  if (percentRemaining < 5) barColor = "#ff716c"; // red
  else if (percentRemaining < 20) barColor = "#ffc965"; // amber

  const resetTime = new Date(data.resetAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="rounded-lg p-4 border mb-5"
      style={{
        backgroundColor: "var(--nc-surface-1)",
        borderColor: "var(--nc-ghost)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--foreground)" }}
        >
          GitHub API Rate Limit
        </h3>
        <span
          className="text-[9px] px-2 py-0.5 rounded"
          style={{
            backgroundColor: data.authenticated
              ? "rgba(0,255,163,0.1)"
              : "rgba(255,201,101,0.1)",
            color: data.authenticated ? "#00ffa3" : "#ffc965",
            border: `1px solid ${data.authenticated ? "rgba(0,255,163,0.2)" : "rgba(255,201,101,0.2)"}`,
          }}
        >
          {data.authenticated ? "Authenticated" : "Unauthenticated"}
        </span>
      </div>

      {/* Quota bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Quota Used
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
            {data.used} / {data.limit}
          </span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--nc-surface-2)" }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${Math.min(100, (data.used / data.limit) * 100)}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      </div>

      {/* Reset info */}
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "var(--muted-foreground)" }}>
          {resetCountdown !== null && resetCountdown > 0
            ? `Resets in ${resetCountdown}m`
            : `Resets at ${resetTime}`}
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>
          {data.remaining} remaining
        </span>
      </div>
    </div>
  );
}
