/**
 * Серверный кошелёк (анонимный).
 *
 * Каждому браузеру выдаётся идентификатор кошелька в подписанной httpOnly-куке.
 * Баланс кредитов хранится на сервере (KV), поэтому его нельзя подделать на
 * клиенте. Пользователю баланс показывается в «поисках» (= credits / SEARCH_COST).
 */
import crypto from "node:crypto";
import { kv } from "./kv";
import { FREE_CREDITS, SEARCH_COST } from "./config";

export const WALLET_COOKIE = "sherlock_wallet";
export const SESSION_COOKIE = "sherlock_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 год

function secret(): string | null {
  return process.env.WALLET_SECRET || null;
}

function sign(id: string, key: string): string {
  return crypto.createHmac("sha256", key).update(id).digest("hex");
}

/** Значение для куки: "id.signature" (если задан WALLET_SECRET), иначе просто id. */
export function cookieValueFor(id: string): string {
  const key = secret();
  return key ? `${id}.${sign(id, key)}` : id;
}

/** Разобрать и проверить значение куки. Возвращает id или null. */
function parseCookieValue(value: string): string | null {
  const key = secret();
  if (!key) return value || null;
  const [id, sig] = value.split(".");
  if (!id || !sig) return null;
  const expected = sign(id, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return id;
}

function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return parseCookieValue(decodeURIComponent(match.slice(name.length + 1)));
}

/** Id залогиненного аккаунта (= email) из сессионной куки, либо null. */
export function getSessionId(req: Request): string | null {
  return readCookie(req, SESSION_COOKIE);
}

/** Id анонимного кошелька (без учёта сессии), либо null. */
export function getAnonWalletId(req: Request): string | null {
  return readCookie(req, WALLET_COOKIE);
}

/**
 * Текущий идентификатор кошелька: сессия аккаунта в приоритете, иначе
 * анонимная кука. Весь учёт баланса работает по этому id.
 */
export function getWalletId(req: Request): string | null {
  return getSessionId(req) || readCookie(req, WALLET_COOKIE);
}

export function newWalletId(): string {
  return crypto.randomUUID();
}

const balanceKey = (id: string) => `wallet:${id}`;
const paidKey = (sessionId: string) => `paid:${sessionId}`;

/** Инициализировать баланс новичка бесплатными кредитами (идемпотентно). */
export async function initWallet(id: string): Promise<void> {
  await kv().setnx(balanceKey(id), String(FREE_CREDITS));
}

export async function balanceCredits(id: string): Promise<number> {
  return Number((await kv().get(balanceKey(id))) || 0);
}

export async function balanceSearches(id: string): Promise<number> {
  return Math.floor((await balanceCredits(id)) / SEARCH_COST);
}

/** Списать кредиты за поиск. Возвращает успех и новый баланс кредитов. */
export async function deductSearch(id: string): Promise<{ ok: boolean; credits: number }> {
  const after = await kv().decrby(balanceKey(id), SEARCH_COST);
  if (after < 0) {
    // Недостаточно средств — откатываем.
    const restored = await kv().incrby(balanceKey(id), SEARCH_COST);
    return { ok: false, credits: restored };
  }
  return { ok: true, credits: after };
}

/** Вернуть кредиты (например, если запуск поиска не удался). */
export async function refundSearch(id: string): Promise<void> {
  await kv().incrby(balanceKey(id), SEARCH_COST);
}

export async function addCredits(id: string, credits: number): Promise<number> {
  return kv().incrby(balanceKey(id), credits);
}

/** Отметить платёж обработанным ровно один раз. true — если это первый раз. */
export async function markPaidOnce(sessionId: string): Promise<boolean> {
  return kv().setnx(paidKey(sessionId), "1");
}
