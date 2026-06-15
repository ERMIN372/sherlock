import { NextResponse } from "next/server";
import { kvConfigured } from "@/lib/kv";
import { consumeResetToken, isValidPassword, updatePassword } from "@/lib/auth";
import { SESSION_COOKIE, balanceSearches, cookieValueFor, initWallet } from "@/lib/wallet";

export const runtime = "nodejs";

/** Установить новый пароль по токену сброса и сразу залогинить. */
export async function POST(req: Request) {
  if (!kvConfigured()) {
    return NextResponse.json({ error: "Not available." }, { status: 503 });
  }

  let token = "";
  let password = "";
  try {
    const body = (await req.json()) as { token?: string; password?: string };
    token = body.token || "";
    password = body.password || "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isValidPassword(password)) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters.", code: "weak_password" },
      { status: 400 },
    );
  }

  const email = await consumeResetToken(token);
  if (!email) {
    return NextResponse.json(
      { error: "Reset link is invalid or expired.", code: "bad_token" },
      { status: 400 },
    );
  }

  await updatePassword(email, password);
  await initWallet(email);

  const res = NextResponse.json({ email, searches: await balanceSearches(email) });
  res.cookies.set(SESSION_COOKIE, cookieValueFor(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
