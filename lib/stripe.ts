/**
 * Minimal Stripe client over the REST API (no SDK dependency).
 *
 * We only need three operations: create a Checkout Session, retrieve a session
 * to verify payment, and verify webhook signatures. Calling the REST API
 * directly keeps the deploy lean and works on Vercel's Node runtime.
 *
 * Docs: https://stripe.com/docs/api
 */
import crypto from "node:crypto";

const API = "https://api.stripe.com/v1";

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
}

async function stripeFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init?.headers || {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe API error (${res.status})`);
  }
  return data;
}

export interface CheckoutParams {
  packId: string;
  credits: number;
  /** Price in whole USD. */
  price: number;
  label: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(
  p: CheckoutParams,
): Promise<{ id: string; url: string }> {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", p.successUrl);
  body.set("cancel_url", p.cancelUrl);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", String(Math.round(p.price * 100)));
  body.set(
    "line_items[0][price_data][product_data][name]",
    `Sherlock — ${p.label} (${p.credits} credits)`,
  );
  body.set("metadata[packId]", p.packId);
  body.set("metadata[credits]", String(p.credits));

  const session = (await stripeFetch("/checkout/sessions", {
    method: "POST",
    body,
  })) as unknown as { id: string; url: string };
  return { id: session.id, url: session.url };
}

export interface RetrievedSession {
  id: string;
  payment_status: string;
  amount_total: number | null;
  metadata: Record<string, string>;
}

export async function retrieveSession(id: string): Promise<RetrievedSession> {
  const s = (await stripeFetch(
    `/checkout/sessions/${encodeURIComponent(id)}`,
  )) as unknown as RetrievedSession;
  return s;
}

/**
 * Verify a Stripe webhook signature (the `stripe-signature` header) against the
 * raw request body, following Stripe's scheme: HMAC-SHA256 of `${t}.${payload}`.
 */
export function verifyWebhookSignature(
  payload: string,
  sigHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.split("=") as [string, string]),
  );
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) return false;

  // Reject stale timestamps to mitigate replay attacks.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isNaN(age) || age > toleranceSeconds) return false;

  const signed = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const a = Buffer.from(signed);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
