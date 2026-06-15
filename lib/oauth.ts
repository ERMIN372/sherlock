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
    const token = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
    if (!token.access_token) return null;
    const infoRes = await fetch("https://login.yandex.ru/info?format=json", {
      headers: { Authorization: `OAuth ${token.access_token}` },
    });
    const info = (await infoRes.json().catch(() => ({}))) as {
      default_email?: string;
      emails?: string[];
    };
    return info.default_email || info.emails?.[0] || null;
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
