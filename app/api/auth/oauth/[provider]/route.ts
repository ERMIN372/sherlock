import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { authorizeUrl, isOAuthProvider, oauthEnabled } from "@/lib/oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "sherlock_oauth_state";

/** Старт OAuth: ставим state-куку (CSRF) и редиректим к провайдеру. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isOAuthProvider(provider) || !oauthEnabled(provider)) {
    return NextResponse.json({ error: "Provider not available." }, { status: 404 });
  }

  const origin =
    req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/oauth/${provider}/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const res = NextResponse.redirect(authorizeUrl(provider, redirectUri, state));
  res.cookies.set(STATE_COOKIE, `${provider}:${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 минут
  });
  return res;
}
