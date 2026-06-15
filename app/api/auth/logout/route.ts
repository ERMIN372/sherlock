import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/wallet";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Стираем сессионную куку — пользователь снова становится анонимным.
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
