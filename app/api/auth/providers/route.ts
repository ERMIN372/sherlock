import { NextResponse } from "next/server";
import { oauthEnabled } from "@/lib/oauth";

export const runtime = "nodejs";

/** Какие OAuth-провайдеры доступны (для отрисовки кнопок входа). */
export async function GET() {
  return NextResponse.json({
    yandex: oauthEnabled("yandex"),
    vk: oauthEnabled("vk"),
  });
}
