/**
 * Платёжный провайдер ЮKassa (для РФ). REST API v3.
 * Docs: https://yookassa.ru/developers/api
 *
 * Аутентификация — Basic (shopId:secretKey). Каждый создающий запрос требует
 * заголовок Idempotence-Key. ЮKassa не подписывает вебхуки HMAC, поэтому
 * входящее уведомление подтверждаем перезапросом статуса платежа через API.
 */
import crypto from "node:crypto";
import type {
  CheckoutParams,
  CheckoutResult,
  PaymentProvider,
  VerifyResult,
} from "./types";

const API = "https://api.yookassa.ru/v3";

interface YooPayment {
  id: string;
  status: string; // pending | waiting_for_capture | succeeded | canceled
  paid: boolean;
  confirmation?: { confirmation_url?: string };
  metadata?: Record<string, string>;
}

export class YooKassaProvider implements PaymentProvider {
  readonly id = "yookassa" as const;
  readonly currency = "rub" as const;

  constructor(
    private readonly shopId: string,
    private readonly secretKey: string,
  ) {}

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString("base64")}`;
  }

  private async call(path: string, init?: RequestInit) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
      description?: string;
    };
    if (!res.ok) throw new Error(data.description || `YooKassa error (${res.status})`);
    return data;
  }

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    const payment = (await this.call("/payments", {
      method: "POST",
      headers: { "Idempotence-Key": crypto.randomUUID() },
      body: JSON.stringify({
        amount: { value: p.price.toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: p.returnUrl },
        description: `Sherlock — ${p.label} (${p.credits} credits)`,
        metadata: {
          packId: p.packId,
          credits: String(p.credits),
          ...(p.walletId ? { walletId: p.walletId } : {}),
        },
      }),
    })) as unknown as YooPayment;

    const url = payment.confirmation?.confirmation_url;
    if (!url) throw new Error("YooKassa did not return a confirmation URL");
    return { id: payment.id, url };
  }

  async verify(id: string): Promise<VerifyResult> {
    const payment = (await this.call(`/payments/${encodeURIComponent(id)}`)) as unknown as YooPayment;
    const paid = payment.status === "succeeded" && payment.paid === true;
    return {
      paid,
      credits: paid ? Number(payment.metadata?.credits || 0) : 0,
      packId: payment.metadata?.packId,
      walletId: payment.metadata?.walletId,
    };
  }

  async parseWebhookId(rawBody: string): Promise<string | null> {
    // ЮKassa не подписывает уведомления — подлинность подтверждается в роуте
    // повторным запросом платежа через verify().
    try {
      const body = JSON.parse(rawBody) as { event?: string; object?: { id?: string } };
      return body.object?.id || null;
    } catch {
      return null;
    }
  }
}
