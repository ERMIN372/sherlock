/**
 * Фабрика платёжного провайдера.
 *
 * Выбор:
 *   - PAYMENT_PROVIDER=yookassa|stripe — явный выбор;
 *   - иначе автоопределение по наличию ключей (ЮKassa приоритетнее для РФ);
 *   - если ключей нет — возвращает null (приложение работает в демо-режиме).
 */
import type { Currency } from "@/lib/packs";
import { StripeProvider } from "./stripe";
import { YooKassaProvider } from "./yookassa";
import type { PaymentProvider } from "./types";

export function getPaymentProvider(): PaymentProvider | null {
  const selected = (process.env.PAYMENT_PROVIDER || "").toLowerCase();

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const yooKey = process.env.YOOKASSA_SECRET_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (selected === "yookassa") {
    if (!shopId || !yooKey) return null;
    return new YooKassaProvider(shopId, yooKey);
  }
  if (selected === "stripe") {
    if (!stripeKey) return null;
    return new StripeProvider(stripeKey);
  }

  // Автоопределение.
  if (shopId && yooKey) return new YooKassaProvider(shopId, yooKey);
  if (stripeKey) return new StripeProvider(stripeKey);
  return null;
}

export interface PaymentInfo {
  enabled: boolean;
  provider: "stripe" | "yookassa" | null;
  currency: Currency;
}

export function paymentInfo(): PaymentInfo {
  const provider = getPaymentProvider();
  return {
    enabled: Boolean(provider),
    provider: provider?.id ?? null,
    // По умолчанию (демо) показываем рубли — основной кейс для РФ.
    currency: provider?.currency ?? "rub",
  };
}

export * from "./types";
