/**
 * Платёжный провайдер Stripe (через REST API, без SDK).
 * Подходит для не-РФ. Docs: https://stripe.com/docs/api
 */
import crypto from "node:crypto";
import type {
  CheckoutParams,
  CheckoutResult,
  PaymentProvider,
  VerifyResult,
} from "./types";

const API = "https://api.stripe.com/v1";

export class StripeProvider implements PaymentProvider {
  readonly id = "stripe" as const;
  readonly currency = "usd" as const;

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret = process.env.STRIPE_WEBHOOK_SECRET,
  ) {}

  private async call(path: string, init?: RequestInit) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(init?.headers || {}),
      },
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(data.error?.message || `Stripe error (${res.status})`);
    return data;
  }

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", p.returnUrl);
    body.set("cancel_url", `${p.returnUrl.split("?")[0]}?canceled=1`);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", "usd");
    body.set("line_items[0][price_data][unit_amount]", String(Math.round(p.price * 100)));
    body.set(
      "line_items[0][price_data][product_data][name]",
      `Sherlock — ${p.label} (${p.credits} credits)`,
    );
    body.set("metadata[packId]", p.packId);
    body.set("metadata[credits]", String(p.credits));

    const s = (await this.call("/checkout/sessions", { method: "POST", body })) as unknown as {
      id: string;
      url: string;
    };
    return { id: s.id, url: s.url };
  }

  async verify(id: string): Promise<VerifyResult> {
    const s = (await this.call(`/checkout/sessions/${encodeURIComponent(id)}`)) as unknown as {
      payment_status: string;
      metadata?: Record<string, string>;
    };
    const paid = s.payment_status === "paid";
    return {
      paid,
      credits: paid ? Number(s.metadata?.credits || 0) : 0,
      packId: s.metadata?.packId,
    };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<boolean> {
    if (!this.webhookSecret) return false;
    const sig = headers.get("stripe-signature");
    if (!sig) return false;
    const parts = Object.fromEntries(sig.split(",").map((kv) => kv.split("=") as [string, string]));
    const t = parts.t;
    const v1 = parts.v1;
    if (!t || !v1) return false;
    const age = Math.abs(Date.now() / 1000 - Number(t));
    if (Number.isNaN(age) || age > 300) return false;
    const signed = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(`${t}.${rawBody}`, "utf8")
      .digest("hex");
    const a = Buffer.from(signed);
    const b = Buffer.from(v1);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}
