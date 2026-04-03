import { kv } from "@vercel/kv";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return Response.json({ report: null });
  }

  try {
    const report = await kv.get(key);
    return Response.json({ report });
  } catch (error) {
    // KV not configured (local dev without credentials)
    return Response.json({ report: null });
  }
}
