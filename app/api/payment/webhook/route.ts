import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { addCredits, markPaidOnce } from "@/lib/wallet";

export const runtime = "nodejs";

/**
 * Приёмник вебхуков платёжного провайдера — надёжное серверное начисление.
 *
 * Подлинность проверяется провайдером (подпись для Stripe, перезапрос платежа
 * для ЮKassa). Кредиты начисляются кошельку из metadata платежа ровно один раз
 * (markPaidOnce), даже если пользователь закрыл вкладку до возврата.
 */
export async function POST(req: Request) {
  const provider = getPaymentProvider();
  if (!provider) {
    return NextResponse.json({ error: "Payments not configured." }, { status: 400 });
  }

  const rawBody = await req.text();
  const paymentId = await provider.parseWebhookId(rawBody, req.headers);
  if (!paymentId) {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }

  try {
    const result = await provider.verify(paymentId);
    if (result.paid && result.credits > 0 && result.walletId) {
      if (await markPaidOnce(paymentId)) {
        await addCredits(result.walletId, result.credits);
      }
    }
  } catch (err) {
    console.error("webhook processing failed:", err);
    return NextResponse.json({ error: "Processing error." }, { status: 502 });
  }

  return NextResponse.json({ received: true });
}
