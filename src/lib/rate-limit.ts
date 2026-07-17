// Simple in-memory sliding-window rate limiter.
// Good for a single-instance deployment; swap for Redis/Upstash if you scale out.

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Extract a best-effort client key from a request (IP behind proxy or direct). */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : "local";
  return `${scope}:${ip}`;
}

// Periodically clear stale buckets so memory doesn't grow unbounded.
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let lastCleanup = Date.now();
export function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [k, v] of buckets) {
    if (now > v.resetAt) buckets.delete(k);
  }
}
