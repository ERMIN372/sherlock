import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook receiver.
 *
 * Verifies the signature and acknowledges payment events. With the current
 * localStorage-based credit model there is no server-side balance to update —
 * credits are granted client-side after /api/payment/verify. This endpoint
 * exists so payments are auditable and ready for a future server-side wallet
 * (DB/KV) without changing the Stripe configuration.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!verifyWebhookSignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    const event = JSON.parse(payload) as { type?: string; data?: { object?: unknown } };
    if (event.type === "checkout.session.completed") {
      // Payment confirmed. Hook for future server-side credit accounting.
      console.log("checkout.session.completed", (event.data?.object as { id?: string })?.id);
    }
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
