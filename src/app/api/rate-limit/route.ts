import { NextResponse } from "next/server";

export interface RateLimitResponse {
  limit: number;
  remaining: number;
  used: number;
  resetAt: string;      // ISO timestamp
  resetInMinutes: number;
  authenticated: boolean;
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  try {
    const res = await fetch("https://api.github.com/rate_limit", { headers });

    if (!res.ok) {
      return NextResponse.json(
        { error: `GitHub API error ${res.status}` },
        { status: res.status }
      );
    }

    const data = (await res.json()) as {
      resources: {
        core: {
          limit: number;
          remaining: number;
          reset: number;
        };
      };
    };

    const { limit, remaining, reset } = data.resources.core;
    const used = limit - remaining;
    const resetAt = new Date(reset * 1000).toISOString();
    const resetInMinutes = Math.ceil((reset * 1000 - Date.now()) / 60000);

    return NextResponse.json({
      limit,
      remaining,
      used,
      resetAt,
      resetInMinutes: Math.max(0, resetInMinutes),
      authenticated: !!token,
    } as RateLimitResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
