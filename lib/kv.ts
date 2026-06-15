/**
 * Минимальное key-value хранилище.
 *
 * В проде использует Vercel KV / Upstash Redis через REST API
 * (env KV_REST_API_URL + KV_REST_API_TOKEN). Если они не заданы — откатывается
 * на in-memory Map.
 *
 * ВНИМАНИЕ: in-memory фолбэк не персистентен и не разделяется между
 * serverless-инстансами — он только для локальной разработки/демо. В проде
 * ОБЯЗАТЕЛЬНО настроить Vercel KV, иначе баланс будет теряться.
 */

export interface KvStore {
  get(key: string): Promise<string | null>;
  /** Установить значение, только если ключа ещё нет. true — если установлено. */
  setnx(key: string, value: string): Promise<boolean>;
  /** Установить (перезаписать) значение. */
  set(key: string, value: string): Promise<void>;
  /** Установить значение с TTL в секундах. */
  setex(key: string, ttlSeconds: number, value: string): Promise<void>;
  del(key: string): Promise<void>;
  incrby(key: string, n: number): Promise<number>;
  decrby(key: string, n: number): Promise<number>;
}

class UpstashStore implements KvStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async command(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    const data = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
    if (!res.ok || data.error) throw new Error(data.error || `KV error (${res.status})`);
    return data.result;
  }

  async get(key: string): Promise<string | null> {
    const r = await this.command(["GET", key]);
    return r == null ? null : String(r);
  }
  async setnx(key: string, value: string): Promise<boolean> {
    const r = await this.command(["SETNX", key, value]);
    return Number(r) === 1;
  }
  async set(key: string, value: string): Promise<void> {
    await this.command(["SET", key, value]);
  }
  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.command(["SET", key, value, "EX", ttlSeconds]);
  }
  async del(key: string): Promise<void> {
    await this.command(["DEL", key]);
  }
  async incrby(key: string, n: number): Promise<number> {
    return Number(await this.command(["INCRBY", key, n]));
  }
  async decrby(key: string, n: number): Promise<number> {
    return Number(await this.command(["DECRBY", key, n]));
  }
}

class MemoryStore implements KvStore {
  private map = new Map<string, string>();
  async get(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  async setnx(key: string, value: string) {
    if (this.map.has(key)) return false;
    this.map.set(key, value);
    return true;
  }
  async set(key: string, value: string) {
    this.map.set(key, value);
  }
  async setex(key: string, ttlSeconds: number, value: string) {
    this.map.set(key, value);
    setTimeout(() => this.map.delete(key), ttlSeconds * 1000).unref?.();
  }
  async del(key: string) {
    this.map.delete(key);
  }
  async incrby(key: string, n: number) {
    const v = Number(this.map.get(key) || 0) + n;
    this.map.set(key, String(v));
    return v;
  }
  async decrby(key: string, n: number) {
    return this.incrby(key, -n);
  }
}

/** REST URL/токен Upstash. Поддерживаем имена и Vercel KV, и Upstash-интеграции. */
function kvUrl(): string | undefined {
  return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
}
function kvToken(): string | undefined {
  return process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
}

let store: KvStore | null = null;
let warned = false;

export function kv(): KvStore {
  if (store) return store;
  const url = kvUrl();
  const token = kvToken();
  if (url && token) {
    store = new UpstashStore(url, token);
  } else {
    if (!warned) {
      console.warn(
        "[kv] KV_REST_API_URL/TOKEN not set — using in-memory store (NOT persistent; dev/demo only).",
      );
      warned = true;
    }
    store = new MemoryStore();
  }
  return store;
}

export function kvConfigured(): boolean {
  // KV_FORCE_MEMORY=1 включает серверный учёт на in-memory сторе (для локали/тестов;
  // НЕ для прод-serverless, где инстансы не разделяют память).
  return Boolean((kvUrl() && kvToken()) || process.env.KV_FORCE_MEMORY === "1");
}
