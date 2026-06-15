/**
 * Minimal in-memory fixed-window rate limiter, keyed by client identifier
 * (IP address). Suitable for a single-instance MVP. For multi-instance
 * deployments swap this for a shared store (e.g. Redis / Upstash).
 */

interface Window {
  count: number;
  resetAt: number;
}

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX || 10);

// Module-level map persists across requests within the same server instance.
const buckets = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const fresh: Window = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, fresh);
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: fresh.resetAt, limit: MAX_REQUESTS };
  }

  if (existing.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt, limit: MAX_REQUESTS };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - existing.count,
    resetAt: existing.resetAt,
    limit: MAX_REQUESTS,
  };
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "anonymous";
}
