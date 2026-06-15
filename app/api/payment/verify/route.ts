import { NextResponse } from "next/server";
import { stripeEnabled } from "@/lib/packs";
import { retrieveSession } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Verify a completed Checkout Session.
 *
 * The client calls this on return from Stripe with the session id. We retrieve
 * the session server-side (so it cannot be spoofed) and report how many credits
 * the paid pack grants. The client grants them once per session id.
 */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }
  if (!stripeEnabled()) {
    return NextResponse.json({ paid: false, error: "Payments not configured." }, { status: 400 });
  }

  try {
    const session = await retrieveSession(sessionId);
    const paid = session.payment_status === "paid";
    const credits = Number(session.metadata?.credits || 0);
    return NextResponse.json({
      paid,
      credits: paid ? credits : 0,
      packId: session.metadata?.packId,
    });
  } catch (err) {
    console.error("stripe verify failed:", err);
    return NextResponse.json(
      { paid: false, error: "Could not verify payment." },
      { status: 502 },
    );
  }
}
