import { NextResponse } from "next/server";
import { kvConfigured } from "@/lib/kv";
import { getUser, normalizeEmail, verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE, balanceSearches, cookieValueFor, initWallet } from "@/lib/wallet";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!kvConfigured()) {
    return NextResponse.json({ error: "Login is not available." }, { status: 503 });
  }

  let email = "";
  let password = "";
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    email = body.email || "";
    password = body.password || "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const normalized = normalizeEmail(email);
  const user = await getUser(normalized);
  if (!user || !verifyPassword(password, user.hash, user.salt)) {
    return NextResponse.json(
      { error: "Wrong email or password.", code: "bad_credentials" },
      { status: 401 },
    );
  }

  await initWallet(normalized);

  const res = NextResponse.json({ email: normalized, searches: await balanceSearches(normalized) });
  res.cookies.set(SESSION_COOKIE, cookieValueFor(normalized), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
