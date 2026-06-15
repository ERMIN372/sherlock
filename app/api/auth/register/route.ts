import { NextResponse } from "next/server";
import { kvConfigured } from "@/lib/kv";
import {
  createUser,
  getUser,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from "@/lib/auth";
import {
  SESSION_COOKIE,
  addCredits,
  balanceCredits,
  balanceSearches,
  cookieValueFor,
  getAnonWalletId,
  initWallet,
} from "@/lib/wallet";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!kvConfigured()) {
    return NextResponse.json({ error: "Registration is not available." }, { status: 503 });
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

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email.", code: "bad_email" }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters.", code: "weak_password" },
      { status: 400 },
    );
  }

  const normalized = normalizeEmail(email);
  if (await getUser(normalized)) {
    return NextResponse.json({ error: "Email already registered.", code: "exists" }, { status: 409 });
  }

  const user = await createUser(normalized, password);
  if (!user) {
    return NextResponse.json({ error: "Email already registered.", code: "exists" }, { status: 409 });
  }

  await initWallet(normalized);

  // Перенос баланса анонимного кошелька на новый аккаунт (если был).
  const anonId = getAnonWalletId(req);
  if (anonId && anonId !== normalized) {
    const anonBalance = await balanceCredits(anonId);
    if (anonBalance > 0) {
      await addCredits(normalized, anonBalance);
      await addCredits(anonId, -anonBalance); // обнуляем анонимный
    }
  }

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
