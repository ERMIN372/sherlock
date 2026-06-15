import { NextResponse } from "next/server";
import { kvConfigured } from "@/lib/kv";
import { createResetToken, getUser, isValidEmail, normalizeEmail } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Запрос на сброс пароля. Всегда отвечаем 200 (не раскрываем, существует ли
 * email). Если пользователь есть — отправляем письмо со ссылкой на сброс.
 */
export async function POST(req: Request) {
  if (!kvConfigured()) {
    return NextResponse.json({ error: "Not available." }, { status: 503 });
  }

  let email = "";
  try {
    const body = (await req.json()) as { email?: string };
    email = body.email || "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email.", code: "bad_email" }, { status: 400 });
  }

  const normalized = normalizeEmail(email);
  const user = await getUser(normalized);
  if (user && user.hash) {
    // Сброс только для аккаунтов с паролем (не OAuth-only).
    const token = await createResetToken(normalized);
    const origin =
      req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const link = `${origin}/reset?token=${token}`;
    await sendEmail({
      to: normalized,
      subject: "Sherlock — password reset",
      html: `<p>Reset your Sherlock password using the link below (valid for 1 hour):</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, ignore this email.</p>`,
      text: `Reset your Sherlock password (valid 1 hour): ${link}`,
    });
  }

  // Одинаковый ответ независимо от существования пользователя.
  return NextResponse.json({ ok: true });
}
