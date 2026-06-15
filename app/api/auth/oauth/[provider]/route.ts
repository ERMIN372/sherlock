import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { authorizeUrl, callbackUrl, isOAuthProvider, oauthEnabled } from "@/lib/oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "sherlock_oauth_state";

/** Старт OAuth: ставим state-куку (CSRF) и редиректим к провайдеру. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isOAuthProvider(provider) || !oauthEnabled(provider)) {
    return NextResponse.json({ error: "Provider not available." }, { status: 404 });
  }

  const redirectUri = callbackUrl(req, provider);

  // ?debug=1 — показать, какой именно redirect_uri отправляется (его и нужно
  // прописать как Callback URL в настройках OAuth-приложения).
  if (new URL(req.url).searchParams.get("debug") === "1") {
    return NextResponse.json({ provider, redirectUri });
  }

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
