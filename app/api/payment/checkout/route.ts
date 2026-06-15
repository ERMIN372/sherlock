import { NextResponse } from "next/server";
import { getPack, stripeEnabled } from "@/lib/packs";
import { createCheckoutSession } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Start a credit purchase.
 *
 * - With Stripe configured: creates a real Checkout Session and returns its URL
 *   for the client to redirect to. Credits are granted only after the payment
 *   is verified on return (see /api/payment/verify).
 * - Without Stripe: falls back to a demo grant so the MVP stays runnable.
 */
export async function POST(req: Request) {
  let packId = "";
  try {
    const body = (await req.json()) as { packId?: string };
    packId = body.packId || "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const pack = getPack(packId);
  if (!pack) {
    return NextResponse.json({ error: "Unknown credit pack." }, { status: 400 });
  }

  // Demo fallback when Stripe keys are not configured.
  if (!stripeEnabled()) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({
      mode: "demo",
      success: true,
      granted: pack.credits,
      pack,
    });
  }

  // Build absolute return URLs from the request origin.
  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(req.url).origin;

  try {
    const session = await createCheckoutSession({
      packId: pack.id,
      credits: pack.credits,
      price: pack.price,
      label: pack.label,
      successUrl: `${origin}/?paid={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/?canceled=1`,
    });
    return NextResponse.json({ mode: "stripe", url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("stripe checkout failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
