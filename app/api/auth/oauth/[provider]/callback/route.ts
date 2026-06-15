import { NextResponse } from "next/server";
import {
  callbackUrl,
  exchangeCodeForEmail,
  isOAuthProvider,
  oauthEnabled,
  oauthStateKey,
  siteOrigin,
} from "@/lib/oauth";
import { ensureOAuthUser } from "@/lib/auth";
import { SESSION_COOKIE, cookieValueFor, initWallet } from "@/lib/wallet";
import { kv, kvConfigured } from "@/lib/kv";

export const runtime = "nodejs";

/** Колбэк OAuth: проверяем state (KV), меняем code на email, логиним, редиректим. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const origin = siteOrigin(req);
  const fail = (reason: string) => {
    console.error(`[oauth:${provider}] callback failed: ${reason}`);
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(reason)}`);
  };

  if (!isOAuthProvider(provider) || !oauthEnabled(provider)) return fail("provider");
  if (!kvConfigured()) return fail("no_storage");

  // Провайдер может вернуть собственную ошибку (например, отказ в доступе).
  const providerError = url.searchParams.get("error");
  if (providerError) return fail(`provider_error:${providerError}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("missing_params");

  // Сверяем state с тем, что сохранили на старте (одноразово).
  const stored = await kv().get(oauthStateKey(state));
  if (stored !== provider) return fail(stored ? "state_mismatch" : "state_missing");
  await kv().del(oauthStateKey(state));

  let email: string | null = null;
  try {
    const redirectUri = callbackUrl(req, provider);
    email = await exchangeCodeForEmail(provider, code, redirectUri);
  } catch (e) {
    console.error(`[oauth:${provider}] exchange threw:`, e);
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
  return res;
}
