import { NextResponse } from "next/server";
import { getProvider, FaceSearchError } from "@/lib/providers";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
// Searches can take a while (provider polling); allow a generous budget.
export const maxDuration = 120;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  // 1. Rate limit per client.
  const rl = checkRateLimit(clientKey(req));
  if (!rl.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many searches. Please slow down.", code: "rate_limited", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // 2. Parse the multipart upload.
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("image");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json(
      { error: "Invalid upload payload.", code: "bad_request" },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json(
      { error: "No image provided.", code: "bad_request" },
      { status: 400 },
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG or WebP.", code: "bad_request" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image too large (max 8 MB).", code: "bad_request" },
      { status: 400 },
    );
  }

  // 3. Hold bytes only in memory for the duration of the request — never
  //    written to disk. They are eligible for GC as soon as the call returns.
  let bytes = Buffer.from(await file.arrayBuffer());

  try {
    const provider = getProvider();
    const outcome = await provider.search({
      bytes,
      mimeType: file.type,
      fileName: file.name || "query.jpg",
    });

    return NextResponse.json(
      {
        provider: outcome.provider,
        demo: outcome.demo,
        count: outcome.items.length,
        items: outcome.items,
        rateLimit: { remaining: rl.remaining, limit: rl.limit },
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof FaceSearchError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("face search failed:", err);
    return NextResponse.json(
      { error: "Search failed unexpectedly.", code: "provider_error" },
      { status: 502 },
    );
  } finally {
    // 4. Explicitly drop the in-memory image after the search completes.
    bytes = Buffer.alloc(0);
  }
}
