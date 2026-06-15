/**
 * OAuth-вход через Яндекс и ВКонтакте (Google НЕ поддерживается намеренно).
 *
 * Стандартный authorization-code flow. Ключи берутся из env; если их нет —
 * провайдер считается выключенным и кнопка не показывается.
 *
 * Redirect URI (нужно прописать в настройках OAuth-приложения):
 *   {origin}/api/auth/oauth/yandex/callback
 *   {origin}/api/auth/oauth/vk/callback
 */
export type OAuthProvider = "yandex" | "vk";

export function isOAuthProvider(p: string): p is OAuthProvider {
  return p === "yandex" || p === "vk";
}

/** Ключ в KV для одноразового state (CSRF-защита OAuth). */
export const oauthStateKey = (state: string) => `oauth:state:${state}`;

/**
 * Канонический origin сайта (без завершающего слэша). Важно, чтобы старт и
 * callback OAuth использовали ОДИН и тот же origin, иначе redirect_uri не
 * совпадёт с зарегистрированным Callback URL.
 *
 * Приоритет: NEXT_PUBLIC_SITE_URL → заголовки прокси (Vercel) → URL запроса.
 */
export function siteOrigin(req: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

/** Callback URL для провайдера — ровно его нужно прописать в настройках приложения. */
export function callbackUrl(req: Request, provider: OAuthProvider): string {
  return `${siteOrigin(req)}/api/auth/oauth/${provider}/callback`;
}

interface Creds {
  clientId: string;
  clientSecret: string;
}

function creds(provider: OAuthProvider): Creds | null {
  if (provider === "yandex") {
    const clientId = process.env.YANDEX_CLIENT_ID;
    const clientSecret = process.env.YANDEX_CLIENT_SECRET;
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  }
  const clientId = process.env.VK_CLIENT_ID;
  const clientSecret = process.env.VK_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function oauthEnabled(provider: OAuthProvider): boolean {
  return creds(provider) !== null;
}

export function authorizeUrl(provider: OAuthProvider, redirectUri: string, state: string): string {
  const c = creds(provider)!;
  if (provider === "yandex") {
    const p = new URLSearchParams({
      response_type: "code",
      client_id: c.clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `https://oauth.yandex.ru/authorize?${p}`;
  }
  // VK (classic OAuth2), запрашиваем email.
  const p = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email",
    state,
    v: "5.131",
  });
  return `https://oauth.vk.com/authorize?${p}`;
}

/** Обменять authorization code на email пользователя. */
export async function exchangeCodeForEmail(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
): Promise<string | null> {
  const c = creds(provider);
  if (!c) return null;

  if (provider === "yandex") {
    const tokenRes = await fetch("https://oauth.yandex.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: c.clientId,
        client_secret: c.clientSecret,
      }),
    });
    const tokenText = await tokenRes.text();
    let token: { access_token?: string } = {};
    try {
      token = JSON.parse(tokenText);
    } catch {
      /* ignore */
    }
    if (!token.access_token) {
      console.error(`[oauth:yandex] token error (${tokenRes.status}): ${tokenText.slice(0, 300)}`);
      return null;
    }
    const infoRes = await fetch("https://login.yandex.ru/info?format=json", {
      headers: { Authorization: `OAuth ${token.access_token}` },
    });
    const infoText = await infoRes.text();
    let info: { default_email?: string; emails?: string[] } = {};
    try {
      info = JSON.parse(infoText);
    } catch {
      /* ignore */
    }
    const email = info.default_email || info.emails?.[0] || null;
    if (!email) {
      console.error(`[oauth:yandex] no email in info (${infoRes.status}): ${infoText.slice(0, 300)}`);
    }
    return email;
  }

  // VK: email возвращается прямо в ответе token-эндпоинта (если выдан scope email).
  const p = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`https://oauth.vk.com/access_token?${p}`);
  const data = (await res.json().catch(() => ({}))) as { email?: string };
  return data.email || null;
}
