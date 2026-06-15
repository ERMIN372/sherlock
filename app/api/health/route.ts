import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Lightweight health/readiness probe. Reports which provider is active so you
 * can confirm a deployment picked up the API token — without leaking the token
 * itself.
 */
export async function GET() {
  const hasToken = Boolean(process.env.FACECHECK_API_TOKEN);
  const selected = (process.env.FACE_SEARCH_PROVIDER || "").toLowerCase();
  const provider =
    selected === "demo" ? "demo" : selected === "facecheck" || hasToken ? "facecheck" : "demo";

  return NextResponse.json({
    status: "ok",
    provider,
    demo: provider === "demo",
    testingMode: process.env.FACECHECK_TESTING_MODE === "true",
    rateLimit: {
      max: Number(process.env.RATE_LIMIT_MAX || 10),
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    },
  });
}
