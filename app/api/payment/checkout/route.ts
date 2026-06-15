import { NextResponse } from "next/server";
import { getPack } from "@/lib/packs";
import { getPaymentProvider, paymentInfo } from "@/lib/payments";
import { addCredits, balanceSearches, getWalletId } from "@/lib/wallet";

export const runtime = "nodejs";

/**
 * Начать покупку.
 *
 * - Провайдер настроен (ЮKassa/Stripe): создаёт платёж и возвращает URL для
 *   редиректа. Кредиты начисляются на сервер только после проверки оплаты
 *   (вебхук + /api/payment/verify) — кошелёк передаётся в metadata платежа.
 * - Провайдера нет: демо-режим — кредиты начисляются на серверный кошелёк сразу.
 */
export async function POST(req: Request) {
  const walletId = getWalletId(req);
  if (!walletId) {
    return NextResponse.json({ error: "No wallet." }, { status: 401 });
  }

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

  // Демо-фолбэк: начисляем на сервер сразу.
  if (!provider) {
    await new Promise((r) => setTimeout(r, 400));
    await addCredits(walletId, pack.credits);
    const searches = await balanceSearches(walletId);
    return NextResponse.json({ mode: "demo", success: true, searches });
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
      walletId,
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
