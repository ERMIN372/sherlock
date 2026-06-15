import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Приёмник вебхуков платёжного провайдера.
 *
 * Проверяет подлинность уведомления (подпись для Stripe, перезапрос платежа для
 * ЮKassa). При текущей модели кредитов в localStorage серверного баланса нет —
 * начисление идёт на клиенте после /api/payment/verify. Эндпоинт нужен для
 * аудита и готовности к будущему серверному кошельку (БД/KV).
 */
export async function POST(req: Request) {
  const provider = getPaymentProvider();
  if (!provider) {
    return NextResponse.json({ error: "Payments not configured." }, { status: 400 });
  }

  const rawBody = await req.text();
  const ok = await provider.verifyWebhook(rawBody, req.headers);
  if (!ok) {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
