interface FetchErrorBannerProps {
  errors: Array<{ repo: string; error: string }>;
  successCount: number;
  totalAttempted: number;
}

export function FetchErrorBanner({ errors, successCount, totalAttempted }: FetchErrorBannerProps) {
  if (errors.length === 0) return null;

  const isPartialFailure = successCount > 0 && successCount < totalAttempted;
  const hasAuthError = errors.some((e) => e.error.includes("401") || e.error.includes("Bad credentials"));
  const hasRateLimit = errors.some((e) => e.error.includes("rate limit") || e.error.includes("429"));

  // Extract reset time if present in error messages
  const resetMatch = errors.find((e) => e.error.includes("Resets at"))?.error.match(/Resets at (.+)$/);
  const resetTime = resetMatch?.[1];

  let title = "Data fetch error";
  let message = "";
  let icon = "⚠️";

  if (successCount === 0) {
    title = "Unable to fetch pipeline data";
    if (hasAuthError) {
      message = "GitHub token is invalid or missing. Add a valid token in Settings.";
    } else if (hasRateLimit) {
      message = resetTime
        ? `GitHub API rate limit exceeded. Resets at ${resetTime}.`
        : "GitHub API rate limit exceeded. Try again in a few minutes.";
    } else {
      message = `Failed to fetch data from ${totalAttempted} repos. Check network connection and Settings.`;
    }
    icon = "❌";
  } else if (isPartialFailure) {
    title = `Partial data (${successCount}/${totalAttempted} repos)`;
    if (hasAuthError) {
      message = "Some repos failed due to authentication. Check token in Settings.";
    } else if (hasRateLimit) {
      message = resetTime
        ? `Rate limit hit on some repos. Resets at ${resetTime}. Showing available data.`
        : "Rate limit hit on some repos. Showing available data.";
    } else {
      message = `${errors.length} repo(s) failed. Showing data from ${successCount} successful requests.`;
    }
  }

  return (
    <div
      className="rounded-lg p-4 border mb-5"
      style={{
        backgroundColor: successCount > 0 ? "rgba(255,201,101,0.08)" : "rgba(255,113,108,0.08)",
        borderColor: successCount > 0 ? "#ffc965" : "#ff716c",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--foreground)" }}>
            {title}
          </h3>
          <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
            {message}
          </p>
          {errors.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium" style={{ color: "var(--muted-foreground)" }}>
                Show errors ({errors.length})
              </summary>
              <ul className="mt-2 space-y-1 pl-4">
                {errors.map((e, i) => (
                  <li key={i} style={{ color: "var(--muted-foreground)" }}>
                    <span className="text-[10px] font-mono" style={{ color: "#ff716c" }}>
                      {e.repo}:{" "}
                    </span>
                    {e.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
