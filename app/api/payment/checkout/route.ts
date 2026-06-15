import { NextResponse } from "next/server";
import { getPack } from "@/lib/packs";
import { getPaymentProvider, paymentInfo } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Начать покупку кредитов.
 *
 * - Если платёжный провайдер настроен (ЮKassa/Stripe) — создаёт реальный платёж
 *   и возвращает URL для редиректа. Кредиты начисляются только после проверки
 *   оплаты на возврате (см. /api/payment/verify).
 * - Если ключей нет — мгновенный демо-грант, чтобы MVP оставался работоспособным.
 */
export async function POST(req: Request) {
  let packId = "";
  try {
    const body = (await req.json()) as { packId?: string };
    packId = body.packId || "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const info = paymentInfo();
  const pack = getPack(packId, info.currency);
  if (!pack) {
    return NextResponse.json({ error: "Unknown credit pack." }, { status: 400 });
  }

  const provider = getPaymentProvider();

  // Демо-фолбэк, когда платёж не настроен.
  if (!provider) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ mode: "demo", success: true, granted: pack.credits, pack });
  }

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(req.url).origin;

  try {
    const checkout = await provider.createCheckout({
      packId: pack.id,
      credits: pack.credits,
      price: pack.price,
      label: pack.label,
      returnUrl: `${origin}/?paid=1`,
    });
    return NextResponse.json({ mode: "checkout", url: checkout.url, id: checkout.id });
  } catch (err) {
    console.error("checkout failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
