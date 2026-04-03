import { NextRequest, NextResponse } from "next/server";
import { fetchAllRepos } from "@/lib/repo-fetcher";

export async function GET(request: NextRequest) {
  const token =
    request.headers.get("x-github-token") ??
    process.env.GITHUB_TOKEN ??
    undefined;

  try {
    const data = await fetchAllRepos(token);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch repos" },
      { status: 500 }
    );
  }
}
