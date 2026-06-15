import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Проверка статуса платежа по его id.
 *
 * Клиент вызывает этот роут после возврата с оплаты. Статус запрашивается у
 * провайдера на сервере (подделать нельзя). Клиент начисляет кредиты один раз
 * на каждый id платежа.
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

  try {
    const result = await provider.verify(id);
    return NextResponse.json({
      paid: result.paid,
      credits: result.paid ? result.credits : 0,
      packId: result.packId,
    });
  } catch (err) {
    console.error("verify failed:", err);
    return NextResponse.json(
      { paid: false, error: "Could not verify payment." },
      { status: 502 },
    );
  }
}
