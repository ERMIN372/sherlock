/**
 * Аутентификация по email + паролю.
 *
 * Хранилище — KV. Пользователь: ключ `user:{email}` -> JSON. Идентификатор
 * аккаунта = нормализованный email; он же служит id кошелька (wallet:{email}),
 * поэтому весь учёт баланса/оплаты работает с аккаунтом без изменений.
 *
 * Сессия — подписанная httpOnly-кука (SESSION_COOKIE) со значением email.
 */
import crypto from "node:crypto";
import { kv } from "./kv";

export interface User {
  email: string;
  hash: string;
  salt: string;
  createdAt: number;
}

const userKey = (email: string) => `user:${email.toLowerCase()}`;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(pw: string): boolean {
  return typeof pw === "string" && pw.length >= 8 && pw.length <= 200;
}

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(computed);
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function getUser(email: string): Promise<User | null> {
  const raw = await kv().get(userKey(normalizeEmail(email)));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/** Создать пользователя. Возвращает null, если email уже занят. */
export async function createUser(email: string, password: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  const { hash, salt } = hashPassword(password);
  const user: User = { email: normalized, hash, salt, createdAt: Date.now() };
  // setnx гарантирует, что не перезапишем существующего пользователя.
  const created = await kv().setnx(userKey(normalized), JSON.stringify(user));
  return created ? user : null;
}
