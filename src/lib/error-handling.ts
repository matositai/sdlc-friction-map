// Error detection and handling utilities

export interface APIError {
  type: "auth" | "rate-limit" | "not-found" | "network" | "validation" | "unknown";
  message: string;
  statusCode?: number;
  retryable: boolean;
}

export function parseAPIError(error: any): APIError {
  const message = error instanceof Error ? error.message : String(error);

  // Rate limit detection
  if (message.includes("API rate limit exceeded") || message.includes("429")) {
    return {
      type: "rate-limit",
      message: "GitHub API rate limit exceeded. Please try again in a few minutes.",
      statusCode: 429,
      retryable: true,
    };
  }

  // Auth errors
  if (message.includes("401") || message.includes("Bad credentials")) {
    return {
      type: "auth",
      message: "Invalid or missing GitHub token. Check your credentials in Settings.",
      statusCode: 401,
      retryable: false,
    };
  }

  // Not found
  if (message.includes("404") || message.includes("not found")) {
    return {
      type: "not-found",
      message: "Repository not found. Check owner and repo name.",
      statusCode: 404,
      retryable: false,
    };
  }

  // Network errors
  if (message.includes("fetch") || message.includes("Network") || message.includes("timeout")) {
    return {
      type: "network",
      message: "Network error. Check your connection and try again.",
      retryable: true,
    };
  }

  // Validation errors
  if (message.includes("required") || message.includes("invalid")) {
    return {
      type: "validation",
      message: message,
      retryable: false,
    };
  }

  return {
    type: "unknown",
    message: message || "An unexpected error occurred",
    retryable: true,
  };
}

export function validateGitHubToken(token?: string): { valid: boolean; message: string } {
  if (!token) {
    return {
      valid: false,
      message: "No GitHub token found. Add one in Settings to enable live data.",
    };
  }

  if (!token.startsWith("ghp_") && !token.startsWith("github_pat_")) {
    return {
      valid: false,
      message: "Invalid GitHub token format. Token should start with 'ghp_' or 'github_pat_'.",
    };
  }

  return {
    valid: true,
    message: "GitHub token is configured",
  };
}

export function getTokenFromEnv(): string | undefined {
  // Dummy check — actual token is only available on server
  return undefined;
}

// Detect if error is due to missing token
export function isMissingTokenError(message: string): boolean {
  return message.includes("401") || message.includes("Bad credentials") || message.includes("Requires authentication");
}

// Detect if error is a rate limit
export function isRateLimitError(message: string): boolean {
  return message.includes("rate limit") || message.includes("429") || message.includes("API rate limit exceeded");
}
