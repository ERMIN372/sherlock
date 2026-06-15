import { NextResponse } from "next/server";
import {
  WALLET_COOKIE,
  balanceSearches,
  cookieValueFor,
  getWalletId,
  initWallet,
  newWalletId,
} from "@/lib/wallet";
import { kvConfigured } from "@/lib/kv";

export const runtime = "nodejs";

/**
 * Возвращает баланс кошелька в «поисках». При первом заходе создаёт кошелёк,
 * начисляет бесплатные поиски и ставит подписанную httpOnly-куку.
 *
 * Если KV не настроен — серверный учёт отключён: возвращаем searches=null
 * (UI трактует это как «без ограничения»).
 */
export async function GET(req: Request) {
  if (!kvConfigured()) {
    return NextResponse.json({ searches: null, accounting: false });
  }

  let id = getWalletId(req);
  let setCookie = false;
  if (!id) {
    id = newWalletId();
    setCookie = true;
  }
  await initWallet(id);
  const searches = await balanceSearches(id);

  const res = NextResponse.json({ searches, accounting: true });
  if (setCookie) {
    res.cookies.set(WALLET_COOKIE, cookieValueFor(id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
