import { validateGitHubToken } from "@/lib/error-handling";

interface TokenStatusProps {
  tokenPresent: boolean;
}

export function TokenStatus({ tokenPresent }: TokenStatusProps) {
  const validation = validateGitHubToken(tokenPresent ? "ghp_" : undefined);

  return (
    <div
      className="rounded-lg p-4 border"
      style={{
        backgroundColor: tokenPresent ? "rgba(0,255,163,0.08)" : "rgba(255,201,101,0.08)",
        borderColor: tokenPresent ? "#00ffa3" : "#ffc965",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{tokenPresent ? "✓" : "⚠"}</span>
        <div>
          <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--foreground)" }}>
            {tokenPresent ? "GitHub Token Configured" : "GitHub Token Missing"}
          </h3>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {tokenPresent
              ? "You can fetch live data from GitHub Actions. Rate limit: 5,000 requests/hour."
              : "Add a GitHub token to Settings to fetch live data. Limited to 60 requests/hour without auth."}
          </p>
        </div>
      </div>
    </div>
  );
}
