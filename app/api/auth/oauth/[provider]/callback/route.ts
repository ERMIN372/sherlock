import { NextResponse } from "next/server";
import { callbackUrl, exchangeCodeForEmail, isOAuthProvider, oauthEnabled, siteOrigin } from "@/lib/oauth";
import { ensureOAuthUser } from "@/lib/auth";
import { SESSION_COOKIE, cookieValueFor, initWallet } from "@/lib/wallet";

export const runtime = "nodejs";

const STATE_COOKIE = "sherlock_oauth_state";

function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

/** Колбэк OAuth: проверяем state, меняем code на email, логиним, редиректим. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const origin = siteOrigin(req);
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(reason)}`);

  if (!isOAuthProvider(provider) || !oauthEnabled(provider)) return fail("provider");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = readCookie(req, STATE_COOKIE);
  if (!code || !state || stateCookie !== `${provider}:${state}`) {
    return fail("state");
  }

  let email: string | null = null;
  try {
    const redirectUri = callbackUrl(req, provider);
    email = await exchangeCodeForEmail(provider, code, redirectUri);
  } catch {
    return fail("exchange");
  }
  if (!email) return fail("no_email");

  await ensureOAuthUser(email);
  await initWallet(email);

  const res = NextResponse.redirect(`${origin}/?auth=ok`);
  res.cookies.set(SESSION_COOKIE, cookieValueFor(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  // Чистим временную state-куку.
  res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
