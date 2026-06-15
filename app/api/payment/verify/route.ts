import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { addCredits, balanceSearches, getWalletId, markPaidOnce } from "@/lib/wallet";

export const runtime = "nodejs";

/**
 * Проверить платёж на возврате и начислить кредиты на сервер (один раз на платёж).
 *
 * Статус запрашивается у провайдера на сервере, поэтому подделать оплату нельзя.
 * Начисление идемпотентно (markPaidOnce) — повторные вызовы не дублируют кредиты.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("session_id");
  if (!id) {
    return NextResponse.json({ error: "Missing payment id." }, { status: 400 });
  }

  const provider = getPaymentProvider();
  if (!provider) {
    return NextResponse.json({ paid: false, error: "Payments not configured." }, { status: 400 });
  }

  const cookieWallet = getWalletId(req);

  try {
    const result = await provider.verify(id);
    if (result.paid && result.credits > 0) {
      // Начисляем кошельку из платежа (или текущему, если в metadata пусто).
      const target = result.walletId || cookieWallet;
      if (target && (await markPaidOnce(id))) {
        await addCredits(target, result.credits);
      }
    }
    const searches = cookieWallet ? await balanceSearches(cookieWallet) : 0;
    return NextResponse.json({ paid: result.paid, searches });
  } catch (err) {
    console.error("verify failed:", err);
    return NextResponse.json({ paid: false, error: "Could not verify payment." }, { status: 502 });
  }
}
