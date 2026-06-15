import { NextResponse } from "next/server";
import { listPacks } from "@/lib/packs";
import { paymentInfo } from "@/lib/payments";

export const runtime = "nodejs";

/** Список пакетов кредитов и информация об активном платёжном провайдере. */
export async function GET() {
  const info = paymentInfo();
  return NextResponse.json({
    enabled: info.enabled,
    provider: info.provider,
    currency: info.currency,
    packs: listPacks(info.currency),
  });
}
