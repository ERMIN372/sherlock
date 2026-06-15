import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * DEMO payment endpoint.
 *
 * This simulates a checkout for credit packs. It does NOT process real money
 * and is intended purely to demonstrate the credits flow in the MVP. In
 * production this would create a real payment session (e.g. Stripe Checkout)
 * and grant credits via a verified webhook.
 */

const PACKS: Record<string, { credits: number; price: number; label: string }> = {
  starter: { credits: 10, price: 5, label: "Starter" },
  plus: { credits: 30, price: 12, label: "Plus" },
  pro: { credits: 100, price: 30, label: "Pro" },
};

export async function GET() {
  return NextResponse.json({
    demo: true,
    packs: Object.entries(PACKS).map(([id, p]) => ({ id, ...p })),
  });
}

export async function POST(req: Request) {
  let packId = "";
  try {
    const body = (await req.json()) as { packId?: string };
    packId = body.packId || "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const pack = PACKS[packId];
  if (!pack) {
    return NextResponse.json({ error: "Unknown credit pack." }, { status: 400 });
  }

  // Simulate processing latency of a payment provider.
  await new Promise((r) => setTimeout(r, 900));

  return NextResponse.json({
    demo: true,
    success: true,
    transactionId: `demo_${Date.now().toString(36)}`,
    granted: pack.credits,
    pack: { id: packId, ...pack },
  });
}
