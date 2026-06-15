import { NextResponse } from "next/server";
import { getProvider, FaceSearchError } from "@/lib/providers";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { balanceSearches, deductSearch, getWalletId, refundSearch } from "@/lib/wallet";

export const runtime = "nodejs";
// Each phase is short (one provider round-trip), so a modest budget is plenty.
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function errorResponse(err: unknown) {
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
}

/**
 * Phase 1 — start a search.
 * Validates and uploads the image to the provider, returns a search handle.
 * The image is held only in memory for this request and never written to disk.
 */
export async function POST(req: Request) {
  const rl = checkRateLimit(clientKey(req));
  if (!rl.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many searches. Please slow down.", code: "rate_limited", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

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

  // Серверная проверка и списание поиска с кошелька.
  const walletId = getWalletId(req);
  if (!walletId) {
    return NextResponse.json(
      { error: "No wallet.", code: "no_wallet" },
      { status: 401 },
    );
  }
  const debit = await deductSearch(walletId);
  if (!debit.ok) {
    return NextResponse.json(
      { error: "Not enough searches.", code: "insufficient" },
      { status: 402 },
    );
  }

  // Hold bytes only in memory for the duration of the upload — never on disk.
  let bytes = Buffer.from(await file.arrayBuffer());
  try {
    const provider = getProvider();
    const started = await provider.start({
      bytes,
      mimeType: file.type,
      fileName: file.name || "query.jpg",
    });

    return NextResponse.json(
      {
        searchId: started.searchId,
        provider: started.provider,
        demo: started.demo,
        searches: await balanceSearches(walletId),
        rateLimit: { remaining: rl.remaining, limit: rl.limit },
      },
      { status: 200 },
    );
  } catch (err) {
    // Запуск не удался — возвращаем списанный поиск.
    await refundSearch(walletId);
    return errorResponse(err);
  } finally {
    // Explicitly drop the in-memory image after upload completes.
    bytes = Buffer.alloc(0);
  }
}

/**
 * Phase 2 — poll a running search.
 * GET /api/search?id=<searchId> -> { status: "pending", progress }
 *                                | { status: "done", items, count, provider, demo }
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Missing search id.", code: "bad_request" },
      { status: 400 },
    );
  }

  try {
    const result = await getProvider().poll(id);
    if (result.status === "pending") {
      return NextResponse.json(
        { status: "pending", progress: result.progress, message: result.message },
        { status: 200 },
      );
    }
    return NextResponse.json(
      {
        status: "done",
        provider: result.provider,
        demo: result.demo,
        count: result.items.length,
        items: result.items,
      },
      { status: 200 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
