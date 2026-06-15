import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { authorizeUrl, callbackUrl, isOAuthProvider, oauthEnabled, oauthStateKey } from "@/lib/oauth";
import { kv, kvConfigured } from "@/lib/kv";

export const runtime = "nodejs";

const STATE_TTL_SECONDS = 600; // 10 минут

/** Старт OAuth: сохраняем state в KV (CSRF) и редиректим к провайдеру. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isOAuthProvider(provider) || !oauthEnabled(provider)) {
    return NextResponse.json({ error: "Provider not available." }, { status: 404 });
  }
  if (!kvConfigured()) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  }

  const redirectUri = callbackUrl(req, provider);

  // ?debug=1 — показать, какой именно redirect_uri отправляется (его и нужно
  // прописать как Callback URL в настройках OAuth-приложения).
  if (new URL(req.url).searchParams.get("debug") === "1") {
    return NextResponse.json({ provider, redirectUri });
  }

  const state = crypto.randomBytes(16).toString("hex");
  // Храним state на сервере (KV), а не в куке — чтобы не зависеть от домена и
  // SameSite при кросс-сайтовом редиректе через провайдера.
  await kv().setex(oauthStateKey(state), STATE_TTL_SECONDS, provider);

  return NextResponse.redirect(authorizeUrl(provider, redirectUri, state));
}
