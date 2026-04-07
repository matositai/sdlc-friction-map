import { kv } from "@vercel/kv";
import type { TrackedCustomRepo } from "@/lib/custom-repos";

const KEY = "custom-repos:all";

// GET — return all custom repos from Upstash Redis
export async function GET() {
  try {
    const repos = (await kv.get<TrackedCustomRepo[]>(KEY)) ?? [];
    return Response.json({ repos });
  } catch (error) {
    // Upstash not configured (local dev without credentials)
    console.debug("Custom repos GET failed:", error instanceof Error ? error.message : String(error));
    return Response.json({ repos: [] });
  }
}

// POST — add a new custom repo
export async function POST(req: Request) {
  try {
    const repo = (await req.json()) as TrackedCustomRepo;
    const existing = (await kv.get<TrackedCustomRepo[]>(KEY)) ?? [];
    await kv.set(KEY, [...existing, repo]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Custom repos POST failed:", error instanceof Error ? error.message : String(error));
    return Response.json({ ok: false, error: "Failed to add repo" }, { status: 500 });
  }
}

// DELETE — remove a custom repo by id
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ ok: false, error: "Missing id parameter" }, { status: 400 });
    }
    const existing = (await kv.get<TrackedCustomRepo[]>(KEY)) ?? [];
    await kv.set(KEY, existing.filter((r) => r.id !== id));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Custom repos DELETE failed:", error instanceof Error ? error.message : String(error));
    return Response.json({ ok: false, error: "Failed to remove repo" }, { status: 500 });
  }
}
